import { findParticipant, isAdminParticipant, isOwner, isSameUser, participantIds } from '../../core/identity.js'
import { targetUser } from '../../lib/targets.js'
import { defineCommand } from '../../types.js'

export default defineCommand({
	name: 'demote',
	alias: ['dm'],
	desc: 'Turns an admin back into a member',
	usage: '%prefix%command @user (or reply to them)',
	category: 'Group',
	react: '✅',
	groupOnly: true,
	adminOnly: true,
	botAdmin: true,
	start: async (client, m, ctx) => {
		const requestedUser = targetUser(m, ctx)
		if (!requestedUser) return m.reply("❌ Couldn't find any user in context")
		const participant = findParticipant(ctx.participants, [requestedUser])
		if (!participant) return m.reply('❌ This user is not a member of this group')
		const ids = participantIds(participant)
		if (isSameUser(ids, [client.user?.id, client.user?.lid])) return m.reply('❌ I cannot change my own admin status')
		if (isOwner(ids)) return m.reply('❌ The configured bot owner is protected')
		if (isSameUser(ids, [ctx.metadata?.owner, ctx.metadata?.ownerPn])) {
			return m.reply('❌ The group owner cannot be demoted')
		}
		if (!isAdminParticipant(participant)) return m.reply('ℹ️ This member is not an admin')
		await client.groupParticipantsUpdate(m.from, [participant.id], 'demote')
		await m.reply(`✅ ${await client.getName(participant.id)} is no longer an admin`)
	}
})
