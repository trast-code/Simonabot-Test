import type { Client, Message } from '../types.js'

type Introduction = {
	step: 'name' | 'hobbies' | 'about'
	name: string
	hobbies: string
	updatedAt: number
}

const pending = new Map<string, Introduction>()
const TTL = 10 * 60 * 1000
const keyFor = (m: Message) => m.from + ':' + (m.senderPn ?? m.sender)

export const beginIntroduction = async (m: Message) => {
	pending.set(keyFor(m), { step: 'name', name: '', hobbies: '', updatedAt: Date.now() })
	return m.reply('👋 Wir erstellen deine Gruppenvorstellung. Deine Antworten werden anschließend in dieser Gruppe veröffentlicht.\n\nWie möchtest du genannt werden? (max. 40 Zeichen)\n\nMit *abbrechen* kannst du jederzeit aufhören.')
}

export const handleIntroductionReply = async (client: Client, m: Message, prefix: string): Promise<boolean> => {
	if (m.text.startsWith(prefix)) return false
	const key = keyFor(m)
	const session = pending.get(key)
	if (!session) return false
	const value = m.text.trim()
	if (!value) return true
	if (Date.now() - session.updatedAt > TTL) {
		pending.delete(key)
		await m.reply('⌛ Deine Vorstellung ist abgelaufen. Starte mit !vorstellen einfach neu.')
		return true
	}
	if (/^(abbrechen|cancel|stop)$/i.test(value)) {
		pending.delete(key)
		await m.reply('Die Vorstellung wurde abgebrochen. Es wurde nichts veröffentlicht.')
		return true
	}
	if (session.step === 'name') {
		if (value.length > 40) { await m.reply('Der Name darf höchstens 40 Zeichen haben. Versuch es bitte noch einmal.'); return true }
		session.name = value; session.step = 'hobbies'; session.updatedAt = Date.now()
		await m.reply('Was sind deine Hobbys oder Interessen? (max. 200 Zeichen)')
		return true
	}
	if (session.step === 'hobbies') {
		if (value.length > 200) { await m.reply('Bitte kürze deine Antwort auf höchstens 200 Zeichen.'); return true }
		session.hobbies = value; session.step = 'about'; session.updatedAt = Date.now()
		await m.reply('Was möchtest du der Gruppe noch über dich erzählen? (optional, schreibe *überspringen*)')
		return true
	}
	if (value.length > 300) { await m.reply('Bitte kürze deine Antwort auf höchstens 300 Zeichen.'); return true }
	const about = /^(überspringen|ueberspringen|skip)$/i.test(value) ? '' : value
	const message = ['👋 *Neues Mitglied stellt sich vor!*', '', '*Name:* ' + session.name, '*Hobbys & Interessen:* ' + session.hobbies, ...(about ? ['*Über mich:* ' + about] : [])].join('\n')
	try {
		await client.sendText(m.from, message)
		pending.delete(key)
		await m.reply('✅ Deine Vorstellung wurde in der Gruppe veröffentlicht.')
	} catch (error) {
		console.error('[vorstellen] Could not publish introduction:', error)
		await m.reply('⚠️ Die Veröffentlichung hat nicht geklappt. Deine Eingaben wurden nicht gespeichert. Starte den Befehl bitte erneut.')
		pending.delete(key)
	}
	return true
}
