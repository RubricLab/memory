import { parseArgs } from 'node:util'
import { PrismaClient } from '@prisma/client'
import { runMultiTurnExamples } from '@/evals/multi-turn'
import type { Database } from '@/types'

const db: Database = new PrismaClient()

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
    --sota    Use gpt-4o-2024-08-06 instead of gpt-4o-mini
    --help    Show this help message
`)
		process.exit(0)
	}

	const model = sota ? 'gpt-4o-2024-08-06' : 'gpt-4o-mini'

	await runMultiTurnExamples({ db, model })
}
