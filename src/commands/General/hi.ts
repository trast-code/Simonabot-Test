import { defineCommand } from '../../types.js'

export default defineCommand({
	name: 'hi',
	alias: ['hello'],
	desc: 'Begrüßt ein Gruppenmitglied',
	category: 'General',
	react: '✅',
	cool: 3,
	start: async (client, m) => {
		const name = m.quoted ? await client.getName(m.quoted.sender) : m.pushName || (await client.getName(m.sender))
		await m.reply(`Hallo ${name}!`)
	}
})
