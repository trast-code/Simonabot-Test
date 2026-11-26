import { defineCommand } from '../../types.js'

export default defineCommand({
	name: 'support',
	alias: ['sup'],
	desc: 'Erklärt Mitgliedern, wie sie den Bot privat kontaktieren',
	usage: '%prefix%command',
	category: 'Group',
	react: '📩',
	groupOnly: true,
	cool: 5,
	start: async (_client, m) => {
		await m.reply('📩 *Du brauchst Hilfe?* Schreib mir bitte direkt privat. Öffne dazu meinen WhatsApp-Chat und sende mir deine Nachricht. Ich antworte dir dort.')
	}
})
