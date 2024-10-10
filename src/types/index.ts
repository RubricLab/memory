import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'

export type Database = NeonHttpDatabase<Record<string, never>>

export type Fact = {
	subject: string
	relation: string
	object: string
	data?: Record<string, string>
}
