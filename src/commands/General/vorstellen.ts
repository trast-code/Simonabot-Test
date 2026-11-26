import { beginIntroduction } from '../../core/introduction.js'
import { defineCommand } from '../../types.js'

export default defineCommand({
	name: 'vorstellen',
	alias: ['intro'],
	desc: 'Erstellt eine Vorstellung und veröffentlicht sie in der Gruppe',
	usage: '%prefix%vorstellen',
	category: 'General',
	cool: 10,
	groupOnly: true,
	start: async (_client, m) => beginIntroduction(m)
})
