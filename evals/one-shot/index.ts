import { openai } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import chalk from 'chalk'
import { z } from 'zod'
import { clean, format } from '../../utils/string.ts'
import { EXAMPLES } from './examples.ts'

export const runOneShotExamples = async ({ fast }: { fast?: boolean }) => {
	let totalFacts = 0
	let totalRecall = 0
	let totalAttempts = 0

	for await (const eg of EXAMPLES) {
		totalFacts += eg.facts.length

		console.log(chalk.yellow(`\n\n"${eg.content}"`))

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
			prompt: clean`Please extract all probable and implicit facts from the following passage.
            Portray the first-person as "user".
            Capture new relationships.
            Try to capture the most up-to-date state of affairs in present tense.
            Passage:
            "${eg.content}"
            `
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

		const omitted: number[] = []

		for (const [i, fact] of eg.facts.entries()) {
			let correctFacts = 0

			console.log(
				`\n🎯 ${i + 1} of ${eg.facts.length}: ${chalk.magenta(fact.subject)} ${chalk.yellow(fact.relation)} ${chalk.blue(fact.object)}`
			)

			for (const [j, attempt] of attempts.entries()) {
				const { subject, relation, object } = attempt

				const correctSubject = fact.subject === subject
				const correctRelation = fact.relation === relation
				const correctObject = fact.object === object

				console.log(
					`🤖 ${j + 1} of ${attempts.length}: ${chalk.magenta(format(subject, correctSubject))} ${chalk.yellow(
						format(relation, correctRelation)
					)} ${chalk.blue(format(object, correctObject))}`
				)

				if (omitted.includes(j)) continue

				correctFacts += Number(correctSubject && correctRelation && correctObject)

				if (correctFacts) {
					omitted.push(j)
					break
				}
			}

			totalRecall += correctFacts
		}

		totalAttempts += attempts.length
	}

	console.log(
		`\n\nPrecision (% of attempts true): ${totalRecall} of ${totalAttempts} ${chalk.green(`(${~~((totalRecall / totalAttempts) * 100)}%)`)}`
	)
	console.log(
		`Recall (% of total facts correctly returned): ${totalRecall} of ${totalFacts} ${chalk.green(`(${~~((totalRecall / totalFacts) * 100)}%)`)}`
	)
}
