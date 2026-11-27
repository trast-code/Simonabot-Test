import { instagramGetUrl } from 'instagram-url-direct'
import { defineCommand } from '../../types.js'

export default defineCommand({
	name: 'igdl',
	alias: ['instagram', 'insta'],
	usage: '%prefix%command <instagram post/reel link>',
	desc: 'Downloads Instagram posts and reels',
	category: 'Media',
	react: '✅',
	cool: 10,
	start: async (client, m, { args, prefix }) => {
		const url = args[0]
		if (!url) return m.reply(`❌ URL is empty!\nSend ${prefix}igdl <url>`)
		let parsed: URL
		try {
			parsed = new URL(url)
		} catch {
			return m.reply('❌ Wrong URL! Only Instagram posts, reels and TV videos can be downloaded.')
		}
		if (
			parsed.protocol !== 'https:' ||
			!['instagram.com', 'www.instagram.com'].includes(parsed.hostname.toLowerCase()) ||
			parsed.username ||
			parsed.password ||
			!/^\/(p|reel|reels|tv)\//.test(parsed.pathname)
		) {
			return m.reply('❌ Wrong URL! Only Instagram posts, reels and TV videos can be downloaded.')
		}
		parsed.search = ''
		parsed.hash = ''

		const result = await instagramGetUrl(parsed.toString()).catch(() => null)
		const media = result?.media_details ?? []
		if (!media.length) return m.reply('Error: the post is private or was not found')

		for (const item of media.slice(0, 10)) {
			await m.reply(item.type === 'video' ? { video: { url: item.url } } : { image: { url: item.url } })
		}
	}
})
