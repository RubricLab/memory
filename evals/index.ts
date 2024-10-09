import { parseArgs } from 'node:util'
import { openai } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import chalk from 'chalk'
import { z } from 'zod'
import { clean, format } from '../utils/string.ts'
import { EXAMPLES } from './extractions.ts'

export const main = async ({ fast }: { fast?: boolean }) => {
	let totalExamples = 0
	let totalRecall = 0
	let totalEntities = 0

	for await (const eg of EXAMPLES) {
		let correctEntities = 0
		let correctFacts = 0

		totalExamples += eg.facts.length

		const {
			object: { facts: attempts }
		} = await generateObject({
			model: openai(fast ? 'gpt-4o-mini' : 'gpt-4o-2024-08-06'),
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
			messages: [
				{
					role: 'system',
					content: clean`Please extract all probable and implicit facts from the following passage.
            Portray the first-person as "user".
            Capture new relationships.
            Try to capture the most up-to-date state of affairs in present tense.
            Passage:
            "${eg.content}"`
				},
				{
					role: 'user',
					content: eg.content
				}
			]
		})

		const omitted: number[] = []

		for (const fact of eg.facts) {
			console.log(
				`\nTarget: ${chalk.magenta(fact.subject)} ${chalk.yellow(fact.relation)} ${chalk.blue(fact.object)}`
			)

			for (const [index, attempt] of attempts.entries()) {
				const { subject, relation, object } = attempt

				const subjectMatch = fact.subject === subject
				const relationMatch = fact.relation === relation
				const objectMatch = fact.object === object

				console.log(
					`${index + 1} of ${attempts.length}: ${chalk.magenta(format(subject, subjectMatch))} ${chalk.yellow(
						format(relation, relationMatch)
					)} ${chalk.blue(format(object, objectMatch))}`
				)

				if (omitted.includes(index)) continue

				correctEntities = Number(subjectMatch) + Number(relationMatch) + Number(objectMatch)
				correctFacts += Number(subjectMatch && relationMatch && objectMatch)

				if (correctEntities === 3) {
					omitted.push(index)
					break
				}
			}
		}

		totalRecall += correctFacts
		totalEntities += correctEntities
	}

	console.log(`\nPrecision: ${chalk.green(`${~~((totalEntities / (totalExamples * 3)) * 100)}%`)}`)
	console.log(`Recall: ${chalk.green(`${~~((totalRecall / totalExamples) * 100)}%`)}`)
}

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

	main({ fast: args.values.fast })
}
