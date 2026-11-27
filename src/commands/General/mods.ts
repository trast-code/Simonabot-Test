import { config } from '../../config.js'
import { defineCommand } from '../../types.js'

export default defineCommand({
	name: 'mods',
	alias: ['mod', 'owner'],
	desc: 'Zeigt das Moderationsteam des Bots',
	category: 'General',
	react: '✅',
	start: async (client, m) => {
		if (!config.owners.length) return m.reply('Für diesen Bot sind keine Moderatoren eingerichtet.')
		const jids = config.owners.map(n => `${n}@s.whatsapp.net`)
		const names = await Promise.all(jids.map(jid => client.getName(jid)))
		const caption = '*🛡️ SimonaBot Moderationsteam*\n\n' + names.map(name => '• ' + name).join('\n')
		// Do not expose moderators' phone numbers by mentioning them in a public group.
		await m.reply(caption)
	}
})
