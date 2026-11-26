import { config } from '../../config.js'
import { defineCommand } from '../../types.js'

export default defineCommand({
	name: 'mods',
	alias: ['mod', 'owner'],
	desc: 'Shows the list of bot moderators',
	category: 'General',
	react: '✅',
	start: async (client, m) => {
		if (!config.owners.length) return m.reply('No moderators are configured for this bot.')
		const jids = config.owners.map(n => `${n}@s.whatsapp.net`)
		let caption = '*🛡️ SimonaBot Moderation-Team*\n'
		for (const jid of jids) {
			caption += `\n*👑 Name:* ${await client.getName(jid)}\n*🎖️ Tag:* @${jid.split('@')[0]}\n`
		}
		await m.reply({ text: caption, mentions: jids })
	}
})
