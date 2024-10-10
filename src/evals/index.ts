import Database from 'bun:sqlite'
import { parseArgs } from 'node:util'
import { runMultiTurnExamples } from '@/evals/multi-turn'
import { runOneShotExamples } from '@/evals/one-shot'

const args = parseArgs({
	args: Bun.argv,
	options: {
		fast: {
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
	const { help, fast, dataset } = args.values
	if (help) {
		console.log(`
  Usage: bun evals/index.ts [options]

  Options:
    --fast    Use gpt-4o-mini instead of gpt-4o-2024-08-06
    --help    Show this help message
`)
		process.exit(0)
	}

	const model = fast ? 'gpt-4o-mini' : 'gpt-4o-2024-08-06'

	const db = new Database(':memory:', { create: true, strict: true })

	await db
		.prepare(
			'create table if not exists facts (subject text, relation text, object text, primary key (subject, object))'
		)
		.get()

	if (dataset === '1') {
		await runOneShotExamples({ db, model })
	} else if (dataset === '2') {
		await runMultiTurnExamples({ db, model })
	}
}
