import { findParticipant, isAdminParticipant, isOwner, isSameUser, participantIds } from '../../core/identity.js'
import { targetUser } from '../../lib/targets.js'
import { defineCommand } from '../../types.js'

export default defineCommand({
	name: 'remove',
	alias: ['boom'],
	desc: 'Removes a member from the group',
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
		if (isSameUser(ids, [client.user?.id, client.user?.lid])) {
			return m.reply("❌ I can't remove myself. Use the leave command instead")
		}
		if (isOwner(ids)) return m.reply('❌ The configured bot owner is protected from removal')
		if (isAdminParticipant(participant)) {
			return m.reply('❌ Group admins cannot be removed with this command')
		}

		await client.groupParticipantsUpdate(m.from, [participant.id], 'remove')
		await m.reply('✅ Member removed')
	}
})
