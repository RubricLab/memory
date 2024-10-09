import type { openai } from '@ai-sdk/openai'
import { Memory } from '../..'
import { EXAMPLES } from './examples'

export const runMultiTurnExamples = async ({ model }: { model: Parameters<typeof openai>[0] }) => {
	const memory = new Memory({ model })

	for await (const eg of EXAMPLES) {
		console.log(eg)
	}
}
