import { config } from '../../config.js'
import { AiUsage } from '../../db/models.js'
import { canonicalId } from '../../core/identity.js'
import { defineCommand } from '../../types.js'

type ChatMessage = { role: 'user' | 'assistant'; content: string }
type Session = { messages: ChatMessage[]; updatedAt: number }

/** Deliberately memory-only: cleared after 30 minutes idle or a process restart. */
const sessions = new Map<string, Session>()
const DAILY_LIMIT = 10
const SESSION_TTL = 30 * 60 * 1000
const MAX_HISTORY_MESSAGES = 10
const MAX_PROMPT_LENGTH = 4000
const MAX_SESSIONS = 5000

/** Calendar day in Germany, so the quota resets at local midnight. */
export const getSimonaBotDay = (date: Date = new Date()): string => {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone: 'Europe/Berlin',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).formatToParts(date)
	const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
	return `${values.year}-${values.month}-${values.day}`
}

const systemPrompt = `Du bist SimbaKI, der KI-Assistent von SimonaBot in WhatsApp-Gruppen.
Deine Persönlichkeit: frech, schlagfertig, intelligent, locker und humorvoll. Du darfst gelegentlich sarkastisch oder leicht provokant sein, aber bleib respektvoll.
Bei ernsten, persönlichen oder gesundheitlichen Themen reagierst du empathisch, sorgfältig und ohne verletzende Witze.
Antworte klar, natürlich und eher kompakt. Behaupte keine Fakten, wenn du unsicher bist.
Du hast kein dauerhaftes Gedächtnis. Nutze nur den Gesprächsverlauf, der dir in dieser Anfrage mitgegeben wird.`

const reserveDailyRequest = async (userId: string, day: string): Promise<boolean> => {
	const existing = await AiUsage.findOneAndUpdate(
		{ userId, day, count: { $lt: DAILY_LIMIT } },
		{ $inc: { count: 1 } },
		{ new: true }
	)
	if (existing) return true

	try {
		await AiUsage.create({ userId, day, count: 1 })
		return true
	} catch (error) {
		// Another simultaneous first request may have created the unique user/day row.
		if ((error as { code?: number })?.code !== 11000) throw error
		const retried = await AiUsage.findOneAndUpdate(
			{ userId, day, count: { $lt: DAILY_LIMIT } },
			{ $inc: { count: 1 } },
			{ new: true }
		)
		return Boolean(retried)
	}
}

export default defineCommand({
	name: 'ki',
	alias: ['simba', 'simbaki'],
	desc: 'Chatte mit SimbaKI (maximal 10 Anfragen pro Tag)',
	usage: '%prefix%ki <deine Nachricht> | %prefix%ki reset',
	category: 'General',
	cool: 2,
	groupOnly: true,
	start: async (_client, m, ctx) => {
		const userId = canonicalId(m.senderPn, m.sender)
		const sessionKey = `${m.from}:${userId}`
		if (['reset', 'zurücksetzen', 'loeschen', 'löschen'].includes(ctx.text.trim().toLowerCase())) {
			sessions.delete(sessionKey)
			return m.reply('🧠 Dein aktueller SimbaKI-Gesprächsverlauf wurde gelöscht.')
		}

		const prompt = ctx.text.trim()
		if (!prompt) return m.reply(`Schreib mir eine Frage oder Nachricht.\nBeispiel: *${ctx.prefix}ki Warum ist der Himmel blau?*\nMit *${ctx.prefix}ki reset* löschst du den aktuellen Gesprächsverlauf.`)
		if (prompt.length > MAX_PROMPT_LENGTH) return m.reply(`Deine Nachricht ist zu lang. Maximal ${MAX_PROMPT_LENGTH} Zeichen.`)
		if (!config.aiApiKey) return m.reply('🛠️ SimbaKI ist noch nicht eingerichtet. Der Betreiber muss den KI-API-Schlüssel hinterlegen.')

		const now = Date.now()
		for (const [key, value] of sessions) {
			if (now - value.updatedAt > SESSION_TTL) sessions.delete(key)
		}
		if (!sessions.has(sessionKey) && sessions.size >= MAX_SESSIONS) {
			const oldest = [...sessions.entries()].reduce<string | undefined>(
				(oldestKey, [key, value]) => !oldestKey || value.updatedAt < sessions.get(oldestKey)!.updatedAt ? key : oldestKey,
				undefined
			)
			if (oldest) sessions.delete(oldest)
		}
		let session = sessions.get(sessionKey)
		if (!session || now - session.updatedAt > SESSION_TTL) session = { messages: [], updatedAt: now }

		const day = getSimonaBotDay()
		const allowed = await reserveDailyRequest(userId, day)
		if (!allowed) return m.reply('⏳ Dein Limit von 10 SimbaKI-Anfragen für heute ist erreicht. Morgen geht es weiter.')

		let answer: string
		try {
			const response = await fetch(`${config.aiBaseUrl.replace(/\/+$/, '')}/chat/completions`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${config.aiApiKey}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					model: config.aiModel,
					messages: [{ role: 'system', content: systemPrompt }, ...session.messages, { role: 'user', content: prompt }],
					temperature: 0.8,
					max_tokens: 600
				}),
				signal: AbortSignal.timeout(45_000)
			})
			if (!response.ok) throw new Error(`KI-Anbieter antwortet mit HTTP ${response.status}`)
			const data = (await response.json()) as { choices?: Array<{ message?: { content?: string | null } }> }
			answer = data.choices?.[0]?.message?.content?.trim() ?? ''
			if (!answer) throw new Error('Der KI-Anbieter hat keine Antwort geliefert.')
		} catch (error) {
			try {
				await AiUsage.updateOne({ userId, day, count: { $gt: 0 } }, { $inc: { count: -1 } })
			} catch (refundError) {
				console.error('[simbaki] Could not refund failed request:', refundError)
			}
			console.error('[simbaki] Provider request failed:', error)
			return m.reply('⚠️ SimbaKI konnte gerade nicht antworten. Deine Anfrage wurde nicht vom Tageslimit abgezogen.')
		}

		try {
			await m.reply(answer)
		} catch (error) {
			try {
				await AiUsage.updateOne({ userId, day, count: { $gt: 0 } }, { $inc: { count: -1 } })
			} catch (refundError) {
				console.error('[simbaki] Could not refund undelivered request:', refundError)
			}
			console.error('[simbaki] Could not deliver reply:', error)
			return
		}

		session.messages.push({ role: 'user', content: prompt }, { role: 'assistant', content: answer })
		session.messages = session.messages.slice(-MAX_HISTORY_MESSAGES)
		session.updatedAt = Date.now()
		sessions.set(sessionKey, session)
	}
})
