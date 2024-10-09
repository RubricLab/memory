import { openai } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import { z } from 'zod'
import { clean } from './utils/string'

export class Memory {
	model: Parameters<typeof openai>[0]
	constructor({
		model
	}: {
		model: Parameters<typeof openai>[0]
	}) {
		this.model = model
	}

	async extract({ content }: { content: string }) {
		const {
			object: { facts }
		} = await generateObject({
			model: openai(this.model),
			schema: z.object({
				facts: z.array(
					z.object({
						subject: z.string(),
						relation: z.string().describe('a verb phrase'),
						object: z.string(),
						data: z.record(z.string(), z.string()).optional().describe('to capture any additional info')
					})
				)
			}),
			prompt: clean`Please extract all probable and implicit facts from the following passage.
            Portray the first-person as "user".
            Capture new relationships.
            Try to capture the most up-to-date state of affairs in present tense.
            Passage:
            "${content}"`
			// messages: [
			// 	{
			// 		role: 'system',
			// 		content: clean`Please extract all probable and implicit facts from the following passage.
			//       Portray the first-person as "user".
			//       Capture new relationships.
			//       Try to capture the most up-to-date state of affairs in present tense.`
			// 	},
			// 	{
			// 		role: 'user',
			// 		content: eg.content
			// 	}
			// ]
		})

		return { facts }
	}
}
