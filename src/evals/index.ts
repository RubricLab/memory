import { parseArgs } from 'node:util'
import { Kysely, PostgresDialect } from 'kysely'
import { Pool } from 'pg'
import { runMultiTurnExamples } from '@/evals/multi-turn'
import type { Schema } from '@/types'
import env from '../../env'

const db = new Kysely<Schema>({
	dialect: new PostgresDialect({
		pool: new Pool({
			connectionString: env.DATABASE_URL
		})
	})
})

const args = parseArgs({
	allowPositionals: true,
	args: Bun.argv,
	options: {
		help: {
			default: false,
			type: 'boolean'
		},
		sota: {
			default: false,
			type: 'boolean'
		}
	}
})

if (import.meta.path === Bun.main) {
	const { help, sota } = args.values

	if (help) {
		console.log(`
  Usage: bun evals/index.ts [options]

  Options:
    --sota    Use gpt-5.1
    --help    Show this help message
`)
		process.exit(0)
	}

	const model = sota ? 'gpt-5.1' : 'gpt-5-mini'

	await runMultiTurnExamples({ db, model })
}
