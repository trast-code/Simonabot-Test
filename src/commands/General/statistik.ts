import { AiUsage, Birthday } from '../../db/models.js'
import { getSimonaBotDay } from './ki.js'
import { defineCommand } from '../../types.js'

export default defineCommand({
	name: 'statistik',
	alias: ['stats'],
	desc: 'Zeigt Gruppenstatistiken; Details nur für Admins und Owner',
	category: 'General',
	cool: 5,
	groupOnly: true,
	start: async (_client, m, ctx) => {
		const day = getSimonaBotDay()
		const month = Number(day.slice(5, 7))
		const [birthdaysThisMonth, totalBirthdays] = await Promise.all([
			Birthday.countDocuments({ groupId: m.from, month }),
			Birthday.countDocuments({ groupId: m.from })
		])
		const lines = [
			'📊 *Statistik für diese Gruppe*',
			'👥 Gruppenmitglieder: ' + (ctx.participants?.length ?? 0),
			'🎂 Eingetragene Geburtstage in diesem Monat: ' + birthdaysThisMonth
		]

		if (ctx.isOwner || ctx.isAdmin) {
			const usage = await AiUsage.aggregate([
				{ $match: { day } },
				{ $group: { _id: null, requests: { $sum: '$count' }, users: { $sum: 1 } } }
			])
			const today = usage[0] ?? { requests: 0, users: 0 }
			lines.push(
				'',
				'*Erweiterte Bot-Statistik (heute, botweit)*',
				'🧠 SimbaKI-Anfragen: ' + today.requests,
				'👤 Mitglieder mit SimbaKI-Nutzung: ' + today.users,
				'🎂 Geburtstage in dieser Gruppe insgesamt: ' + totalBirthdays
			)
		}

		return m.reply(lines.join('\n'))
	}
})
