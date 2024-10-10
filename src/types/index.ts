import type { Database as BunDatabase } from 'bun:sqlite'

export type Fact = {
	subject: string
	relation: string
	object: string
	data?: Record<string, string>
}

export type Database = BunDatabase
