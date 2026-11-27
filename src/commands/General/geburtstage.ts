import { Birthday } from '../../db/models.js'
import { defineCommand } from '../../types.js'

export default defineCommand({
	name: 'geburtstage',
	alias: ['birthdays'],
	desc: 'Zeigt die Geburtstage des aktuellen Monats',
	category: 'General',
	cool: 3,
	groupOnly: true,
	start: async (_client, m) => {
		const now = new Date()
		const month = Number(new Intl.DateTimeFormat('en', { timeZone: 'Europe/Berlin', month: 'numeric' }).format(now))
		const entries = await Birthday.find({ groupId: m.from, month }).sort({ day: 1, name: 1 }).lean()
		if (!entries.length) return m.reply('🎂 Für diesen Monat sind noch keine Geburtstage eingetragen.')
		const monthName = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', month: 'long' }).format(now)
		const lines = entries.map(entry => '• ' + entry.name + ': ' + String(entry.day).padStart(2, '0') + '.' + String(entry.month).padStart(2, '0') + '.')
		return m.reply('🎂 *Geburtstage im ' + monthName + '*\n\n' + lines.join('\n'))
	}
})
