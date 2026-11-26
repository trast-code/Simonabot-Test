import { expect, test } from 'bun:test'
import { getSimonaBotDay } from '../src/commands/General/ki.ts'

test('SimbaKI daily quota uses the German calendar day in winter', () => {
	expect(getSimonaBotDay(new Date('2026-11-26T22:59:59.000Z'))).toBe('2026-11-26')
	expect(getSimonaBotDay(new Date('2026-11-26T23:00:00.000Z'))).toBe('2026-11-27')
})

test('SimbaKI daily quota follows daylight saving time in summer', () => {
	expect(getSimonaBotDay(new Date('2026-06-30T21:59:59.000Z'))).toBe('2026-06-30')
	expect(getSimonaBotDay(new Date('2026-06-30T22:00:00.000Z'))).toBe('2026-07-01')
})
