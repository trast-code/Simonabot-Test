import { canonicalId } from '../../core/identity.js'
import { Birthday } from '../../db/models.js'
import { defineCommand } from '../../types.js'

export default defineCommand({
	name: 'geburtstag',
	alias: ['birthday'],
	desc: 'Speichert oder ändert deinen Geburtstag (TT.MM)',
	usage: '%prefix%geburtstag 14.03 | %prefix%geburtstag löschen',
	category: 'General',
	cool: 3,
	groupOnly: true,
	start: async (_client, m, ctx) => {
		const userId = canonicalId(m.senderPn, m.sender)
		const value = ctx.text.trim().toLowerCase()
		if (['löschen', 'loeschen', 'delete', 'clear'].includes(value)) {
			const result = await Birthday.deleteOne({ userId })
			return m.reply(result.deletedCount ? 'Dein Geburtstag wurde gelöscht.' : 'Für dich ist kein Geburtstag gespeichert.')
		}

		const match = /^(0?[1-9]|[12]\d|3[01])\.(0?[1-9]|1[0-2])$/.exec(value)
		if (!match) return m.reply('Bitte gib deinen Geburtstag als TT.MM ein, zum Beispiel !geburtstag 14.03. Mit !geburtstag löschen entfernst du ihn.')
		const day = Number(match[1])
		const month = Number(match[2])
		const daysInMonth = new Date(Date.UTC(2000, month, 0)).getUTCDate()
		if (day > daysInMonth) return m.reply('Dieses Datum gibt es nicht. Bitte prüfe Tag und Monat.')

		await Birthday.findOneAndUpdate(
			{ userId },
			{ $set: { userId, name: m.pushName || 'Unbekannt', day, month } },
			{ upsert: true, new: true, setDefaultsOnInsert: true }
		)
		return m.reply('🎂 Dein Geburtstag ist jetzt für den ' + String(day).padStart(2, '0') + '.' + String(month).padStart(2, '0') + ' gespeichert. Du kannst ihn jederzeit ändern.')
	}
})
