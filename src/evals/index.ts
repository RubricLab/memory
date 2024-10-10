import Database from 'bun:sqlite'
import { parseArgs } from 'node:util'
import { runMultiTurnExamples } from '@/evals/multi-turn'
import { runOneShotExamples } from '@/evals/one-shot'

const args = parseArgs({
	args: Bun.argv,
	options: {
		sota: {
			type: 'boolean',
			default: false
		},
		dataset: {
			type: 'string',
			default: '1',
			choices: ['1', '2']
		},
		help: {
			type: 'boolean',
			default: false
		}
	},
	allowPositionals: true
})

if (import.meta.path === Bun.main) {
	const { help, sota, dataset } = args.values
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

	const bunDB = new Database(':memory:', { create: true, strict: true })

	const db = {
		execute: async (cmd: string) => await bunDB.prepare(cmd).get()
	}

	await db.execute(
		'create table if not exists facts (subject text, relation text, object text, primary key (subject, object))'
	)

	if (dataset === '1') {
		await runOneShotExamples({ db, model })
	} else if (dataset === '2') {
		await runMultiTurnExamples({ db, model })
	}
}
