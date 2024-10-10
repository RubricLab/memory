import type { Database, Fact } from '@/types'
import { clean } from '@/utils/string'
import { openai } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import { z } from 'zod'

export class Memory {
	model: Parameters<typeof openai>[0]
	db: Database

	async createTable() {
		await this.db.execute(
			'create table if not exists facts (subject text, relation text, object text, primary key (subject, object))'
		)
	}

	constructor({
		model,
		db
	}: {
		model: Parameters<typeof openai>[0]
		db: Database
	}) {
		this.model = model
		this.db = db

		this.createTable()
	}

	async extract({ content }: { content: string }) {
		const {
			object: { entities }
		} = await generateObject({
			model: openai(this.model),
			schema: z.object({
				entities: z.array(
					z.object({
						subject: z.string()
					})
				)
			}),
			prompt: clean`Please extract all entities, subject or objects, from the following passage.
            Portray the first-person as "user".
            Passage:
            "${content}"`
		})

		const tags = entities?.map(({ subject }) => `"${subject}"`).join(', ') || ''

		const { rows: relevantFacts } = await this.db.execute(
			`select * from facts where subject in (${tags}) or object in (${tags})`
		)

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
						Existing facts to consider and optionally update. A (subject,object) pair is unique, so use relation for negation:
						${relevantFacts
							?.map(({ subject, relation, object }) => `${subject} ${relation} ${object}`)
							.join('\n ')}
            Passage:
            "${content}"`
		})

		return { facts }
	}

	async insert({ content }: { content: string }) {
		const { facts } = await this.extract({ content })

		for await (const fact of facts) {
			const { subject, relation, object } = fact

			// this.db
			// 	.execute(`
			// 		insert into facts (subject, relation, object)
			// 		values ($1, $2, $3)
			// 		on conflict (subject, object) do update set relation = $2
			// 	`)
			// 	.run(subject, relation, object)

			// can you make the above work with Drizzle-ORM?
			await this.db.execute(
				'insert into facts (subject, relation, object) values ($1, $2, $3) on conflict (subject, object) do update set relation = $2',
				[subject, relation, object]
			)
		}

		const { rows: priorFacts } = await this.db.execute('select * from facts')
		console.log({ priorFacts })
	}
}
