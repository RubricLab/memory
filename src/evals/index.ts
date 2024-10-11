import { parseArgs } from 'node:util'
import { runMultiTurnExamples } from '@/evals/multi-turn'
import type { Database } from '@/types'
import { PrismaClient } from '@prisma/client'

const db: Database = new PrismaClient()

const args = parseArgs({
	args: Bun.argv,
	options: {
		sota: {
			type: 'boolean',
			default: false
		},

		help: {
			type: 'boolean',
			default: false
		}
	},
	allowPositionals: true
})

if (import.meta.path === Bun.main) {
	const { help, sota } = args.values

	if (help) {
		console.log(`
  Usage: bun evals/index.ts [options]

  Options:
    --sota    Use gpt-4o-2024-08-06 instead of gpt-4o-mini
    --help    Show this help message
`)
		process.exit(0)
	}

	const model = sota ? 'gpt-4o-2024-08-06' : 'gpt-4o-mini'

	await runMultiTurnExamples({ db, model })
}
