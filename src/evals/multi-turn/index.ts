import { Memory } from '@/index'
import type { Database, Fact, LLM } from '@/types'
import { format } from '@/utils/string'
import chalk from 'chalk'
import { EXAMPLES } from './examples'

export const runMultiTurnExamples = async ({ db, model }: { model: LLM; db: Database }) => {
	const memory = new Memory({ model, db })

	let totalFacts = 0
	let totalRecall = 0
	let totalAttempts = 0

	for await (const eg of EXAMPLES) {
		for await (const message of eg.messages) {
			totalFacts += message.facts.length

			console.log(chalk.yellow(`\n\n"${message.content}"`))

			const { facts: attempts } = await memory.extract({
				content: message.content
			})

			const omitted: number[] = []

			for (const [i, fact] of message.facts.entries()) {
				let correctFacts = 0

				console.log(
					`\n🎯 ${i + 1} of ${message.facts.length}: ${chalk.magenta(fact.subject)} ${chalk.yellow(fact.relation)} ${chalk.blue(fact.object)}`
				)

				const newFacts = (await db.execute('select * from facts')) as Fact[]

				for (const [k, newFact] of newFacts.entries()) {
					const { subject, relation, object } = newFact as Fact

					const correctSubject = fact.subject === subject
					const correctRelation = fact.relation === relation
					const correctObject = fact.object === object

					console.log(
						`🤖 ${k + 1} of ${newFacts.length}: ${chalk.magenta(format(subject, correctSubject))} ${chalk.yellow(
							format(relation, correctRelation)
						)} ${chalk.blue(format(object, correctObject))}`
					)

					if (omitted.includes(k)) continue

					correctFacts += Number(correctSubject && correctRelation && correctObject)

					if (correctFacts) {
						omitted.push(k)
						break
					}
				}

				totalRecall += correctFacts
			}

			totalAttempts += attempts.length
		}
	}

	console.log(
		`\n\nPrecision (% of attempts true): ${totalRecall} of ${totalAttempts} ${chalk.green(`(${~~((totalRecall / totalAttempts) * 100)}%)`)}`
	)
	console.log(
		`Recall (% of total facts correctly returned): ${totalRecall} of ${totalFacts} ${chalk.green(`(${~~((totalRecall / totalFacts) * 100)}%)`)}`
	)
}
