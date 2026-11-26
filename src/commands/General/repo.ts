import { fetchJson } from '../../lib/http.js'
import { pickRandom } from '../../lib/utils.js'
import { defineCommand } from '../../types.js'

const IMAGES = [
	'https://images6.alphacoders.com/103/1037400.png',
	'https://images3.alphacoders.com/110/1105901.jpg',
	'https://images5.alphacoders.com/102/1028689.jpg',
	'https://images4.alphacoders.com/102/1029828.png',
	'https://images8.alphacoders.com/120/1206602.png'
]

export default defineCommand({
	name: 'repo',
	desc: 'Zeigt Informationen zum SimonaBot-Repository',
	category: 'General',
	react: '✅',
	start: async (_client, m) => {
		const repo = await fetchJson('https://api.github.com/repos/trast-code/Simonabot-Test')
		const caption =
			`✨ *SimonaBot* ✨\n\n📎 *Repository:* ${repo.html_url}\n\n📝 *Beschreibung:* ${repo.description || 'SimonaBot auf Basis von Nezuko'}\n\n⭐ *Stars:* ${repo.stargazers_count}\n\n🍴 *Forks:* ${repo.forks}`
		await m.reply({ image: { url: pickRandom(IMAGES) }, caption })
	}
})
