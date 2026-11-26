import mongoose, { Schema, model } from 'mongoose'

/** Known display names of users (from push names / contacts). */
const userSchema = new Schema({
	id: { type: String, required: true, unique: true },
	name: { type: String }
})
export const User = model('User', userSchema)

/**
 * XP levels. Same collection and fields the old `discord-xp` package used,
 * so existing XP carries over after upgrading.
 */
const levelSchema = new Schema({
	userID: { type: String, required: true },
	guildID: { type: String, required: true },
	xp: { type: Number, default: 0 },
	level: { type: Number, default: 0 },
	lastUpdated: { type: Date, default: () => new Date() }
})
levelSchema.index({ userID: 1, guildID: 1 }, { unique: true })
export const Level = model('Levels', levelSchema)

/** Simple list storage that replaces quick.db (antilink/nsfw/events groups, banned users). */
const settingSchema = new Schema({
	_id: { type: String, required: true },
	values: { type: [String], default: [] }
})
export const Setting = model('Setting', settingSchema)

/** Daily SimbaKI request totals only; conversation text is never persisted. */
const aiUsageSchema = new Schema({
	userId: { type: String, required: true },
	day: { type: String, required: true },
	count: { type: Number, default: 0 },
	createdAt: { type: Date, default: () => new Date() }
})
aiUsageSchema.index({ userId: 1, day: 1 }, { unique: true })
// Keep aggregate quota records for 90 days, then let MongoDB remove them automatically.
aiUsageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 })
export const AiUsage = model('SimbaKIUsage', aiUsageSchema)

/** Birthday dates only; no birth year or age is stored. */
const birthdaySchema = new Schema({
	groupId: { type: String, required: true },
	userId: { type: String, required: true },
	name: { type: String, required: true },
	day: { type: Number, required: true, min: 1, max: 31 },
	month: { type: Number, required: true, min: 1, max: 12 }
})
birthdaySchema.index({ groupId: 1, userId: 1 }, { unique: true })
birthdaySchema.index({ groupId: 1, month: 1, day: 1 })
export const Birthday = model('Birthday', birthdaySchema)

/** The session collection used by the old v6 auth store, read once for migration. */
const legacySessionSchema = new Schema({
	sessionId: { type: String, required: true, unique: true },
	session: String
})
export const LegacySession = model('sessionschemas', legacySessionSchema)

export const connectDatabase = async (uri: string) => {
	mongoose.set('strictQuery', true)
	await mongoose.connect(uri, { serverSelectionTimeoutMS: 15_000 })
	return mongoose.connection
}
