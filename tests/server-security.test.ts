import { once } from 'node:events'
import { expect, test } from 'bun:test'
import type { AddressInfo } from 'node:net'
import { createServer } from '../src/server.js'

const secret = 'a'.repeat(64)

const withServer = async (run: (baseUrl: string) => Promise<void>) => {
	const server = createServer(secret).listen(0, '127.0.0.1')
	await once(server, 'listening')
	const address = server.address() as AddressInfo
	try {
		await run(`http://127.0.0.1:${address.port}`)
	} finally {
		await new Promise<void>((resolve, reject) => {
			server.close(error => (error ? reject(error) : resolve()))
		})
	}
}

const basic = (username: string, password: string) =>
	`Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`

test('QR endpoint rejects missing credentials and does not accept a URL password', async () => {
	await withServer(async baseUrl => {
		const missing = await fetch(`${baseUrl}/qr`)
		expect(missing.status).toBe(401)
		expect(missing.headers.get('www-authenticate')).toContain('Basic')

		const queryPassword = await fetch(`${baseUrl}/qr?session=${secret}`)
		expect(queryPassword.status).toBe(401)
	})
})

test('QR endpoint accepts only the expected Basic Auth username and secret', async () => {
	await withServer(async baseUrl => {
		const wrongUser = await fetch(`${baseUrl}/qr`, {
			headers: { Authorization: basic('admin', secret) }
		})
		expect(wrongUser.status).toBe(401)

		const wrongPassword = await fetch(`${baseUrl}/qr`, {
			headers: { Authorization: basic('qr', 'wrong-secret') }
		})
		expect(wrongPassword.status).toBe(401)

		const valid = await fetch(`${baseUrl}/qr`, {
			headers: { Authorization: basic('qr', secret) }
		})
		// Auth is accepted; QR is unavailable in this isolated test.
		expect(valid.status).toBe(503)
		expect(valid.headers.get('cache-control')).toContain('no-store')
		expect(valid.headers.get('referrer-policy')).toBe('no-referrer')
	})
})

test('QR endpoint rate-limits the sixth failed authentication attempt', async () => {
	await withServer(async baseUrl => {
		for (let attempt = 1; attempt <= 5; attempt++) {
			const response = await fetch(`${baseUrl}/qr`, {
				headers: { Authorization: basic('qr', 'wrong-secret') }
			})
			expect(response.status).toBe(401)
		}

		const blocked = await fetch(`${baseUrl}/qr`, {
			headers: { Authorization: basic('qr', secret) }
		})
		expect(blocked.status).toBe(429)
		expect(Number(blocked.headers.get('retry-after'))).toBeGreaterThan(0)
	})
})
