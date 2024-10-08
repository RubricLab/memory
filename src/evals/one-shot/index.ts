import { Memory } from '@/index'
import type { Database, LLM } from '@/types'
import { format } from '@/utils/string'
import chalk from 'chalk'
import { EXAMPLES } from './examples'

export const runOneShotExamples = async ({ db, model }: { model: LLM; db: Database }) => {
	const memory = new Memory({ model, db })

	let totalFacts = 0
	let totalRecall = 0
	let totalAttempts = 0

	for await (const eg of EXAMPLES) {
		totalFacts += eg.facts.length

		console.log(chalk.yellow(`\n\n"${eg.content}"`))

		const { facts: attempts } = await memory.extract({
			content: eg.content
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
