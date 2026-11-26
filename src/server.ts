import { createHash, timingSafeEqual } from 'node:crypto'
import express from 'express'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import qrcode from 'qrcode'
import { config } from './config.js'
import { connectionState } from './core/socket.js'

const publicDir = join(fileURLToPath(import.meta.url), '..', '..', 'public')
const WINDOW_MS = 15 * 60_000
const MAX_ATTEMPTS = 5
const MAX_TRACKED_IPS = 10_000

type ServerOptions = {
  requireHttps?: boolean
  trustProxyHops?: number
}

const matchesSecret = (candidate: string, expected: string): boolean => {
  const candidateHash = createHash('sha256').update(candidate).digest()
  const expectedHash = createHash('sha256').update(expected).digest()
  return timingSafeEqual(candidateHash, expectedHash)
}

export const createServer = (
  sessionSecret = config.sessionId,
  options: ServerOptions = {}
) => {
  const app = express()
  const requireHttps = options.requireHttps ?? config.qrRequireHttps
  const trustProxyHops = options.trustProxyHops ?? config.trustProxyHops
  const failedAttempts = new Map<string, { count: number; resetAt: number }>()

  // Only configure this when the stated number of reverse-proxy hops is trusted.
  if (trustProxyHops > 0) app.set('trust proxy', trustProxyHops)

  app.disable('x-powered-by')
  app.use('/', express.static(publicDir))

  app.get('/health', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    res.json({ status: connectionState.status })
  })

  app.get('/qr', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Referrer-Policy', 'no-referrer')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')

    if (requireHttps && !req.secure) {
      return void res.status(403).send('HTTPS is required for QR access')
    }

    const ip = req.ip || req.socket.remoteAddress || 'unknown'
    const now = Date.now()

    // Expire old entries and cap memory use even if requests come from many IPs.
    for (const [trackedIp, entry] of failedAttempts) {
      if (entry.resetAt <= now) failedAttempts.delete(trackedIp)
    }

    const current = failedAttempts.get(ip)
    if (current && current.count >= MAX_ATTEMPTS) {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((current.resetAt - now) / 1000))))
      return void res.status(429).send('Too many failed authentication attempts. Try again later.')
    }

    const header = req.headers.authorization ?? ''
    const match = /^Basic\s+(.+)$/i.exec(header)
    let password = ''
    if (match) {
      const decoded = Buffer.from(match[1], 'base64').toString('utf8')
      const separator = decoded.indexOf(':')
      if (separator >= 0 && decoded.slice(0, separator) === 'qr') password = decoded.slice(separator + 1)
    }

    if (!password || !sessionSecret || !matchesSecret(password, sessionSecret)) {
      const next = current ?? { count: 0, resetAt: now + WINDOW_MS }
      next.count++
      // Map insertion order makes the oldest entry the first one evicted.
      if (!failedAttempts.has(ip) && failedAttempts.size >= MAX_TRACKED_IPS) {
        const oldestIp = failedAttempts.keys().next().value
        if (oldestIp !== undefined) failedAttempts.delete(oldestIp)
      }
      failedAttempts.set(ip, next)
      res.setHeader('WWW-Authenticate', 'Basic realm="SimonaBot QR", charset="UTF-8"')
      return void res.status(401).send('Authentication required')
    }

    failedAttempts.delete(ip)
    if (connectionState.status === 'open') return void res.status(409).send('Session already exists')
    if (connectionState.pairingCode) return void res.type('text/plain').send(`Pairing code: ${connectionState.pairingCode}`)
    if (!connectionState.qr) return void res.status(503).send('QR code not ready yet, refresh in a few seconds')
    res.type('png')
    res.send(await qrcode.toBuffer(connectionState.qr, { width: 360 }))
  })

  return app
}

export const startServer = () => {
  createServer().listen(config.port, () => console.log(`[server] Listening on port ${config.port}`))
}
