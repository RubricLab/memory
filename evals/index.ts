import { parseArgs } from 'node:util'
import { runOneShotExamples } from './one-shot'
import { runMultiTurnExamples } from './multi-turn'

const args = parseArgs({
	args: Bun.argv,
	options: {
		fast: {
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
	if (args.values.help) {
		console.log(`
  Usage: bun evals/index.ts [options]

  Options:
    --fast    Use gpt-4o-mini instead of gpt-4o-2024-08-06
    --help    Show this help message
`)
		process.exit(0)
	}

	const model = args.values.fast ? 'gpt-4o-mini' : 'gpt-4o-2024-08-06'

	await runOneShotExamples({ model })
	await runMultiTurnExamples({ model })
}
