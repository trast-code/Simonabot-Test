import { config as loadEnv } from 'dotenv'

// Bun loads .env on its own; Node needs dotenv. Calling it under Bun is harmless.
loadEnv({ quiet: true })

const env = (name: string): string | undefined => {
	const value = process.env[name]?.trim()
	return value ? value : undefined
}

const int = (name: string, fallback: number): number => {
	const parsed = Number.parseInt(env(name) ?? '', 10)
	return Number.isFinite(parsed) ? parsed : fallback
}

/** Phone numbers (digits only, with country code) of the bot owners. */
const owners = (env('MODS') ?? '')
	.split(',')
	.map(n => n.replace(/[^0-9]/g, ''))
	.filter(Boolean)

export const config = {
	owners,
	mongodb: env('MONGODB'),
	prefix: env('PREFIX') ?? '!',
	sessionId: env('SESSION_ID') ?? '',
	port: int('PORT', 8080),
	trustProxyHops: int('TRUST_PROXY_HOPS', 0),
	qrRequireHttps: env('QR_REQUIRE_HTTPS') !== 'false',
	logLevel: env('LOG_LEVEL') ?? 'silent',

	/** OpenAI-compatible chat-completions API used by SimbaKI. */
	aiApiKey: env('AI_API_KEY'),
	aiBaseUrl: env('AI_BASE_URL') ?? 'https://api.openai.com/v1',
	aiModel: env('AI_MODEL') ?? 'gpt-4o-mini',

	pairingNumber: env('PAIRING_NUMBER')?.replace(/[^0-9]/g, ''),
	googleApiKey: env('GOOGLE_API'),
	googleCx: env('GOOGLE_CX') ?? 'baf9bdb0c631236e5',
	weatherApiKey: env('WEATHER_API'),
	spotifyClientId: env('SPOTIFY_CLIENT_ID'),
	spotifyClientSecret: env('SPOTIFY_CLIENT_SECRET'),

	youtubeCookie: env('YT_COOKIE'),
	youtubePoToken: env('YT_PO_TOKEN'),
	youtubeAutoPoToken: env('YT_AUTO_PO_TOKEN') !== 'false' && !env('YT_COOKIE') && !env('YT_PO_TOKEN'),
	youtubeDownloader: (['auto', 'youtubei', 'yt-dlp'].includes(env('YT_DOWNLOADER') ?? '') ? env('YT_DOWNLOADER') : 'auto') as
		| 'auto'
		| 'youtubei'
		| 'yt-dlp',
	maxAudioMinutes: int('MAX_AUDIO_MINUTES', 20),
	maxVideoMinutes: int('MAX_VIDEO_MINUTES', 10),
	maxVideoHeight: int('MAX_VIDEO_HEIGHT', 720)
} as const

export type Config = typeof config
