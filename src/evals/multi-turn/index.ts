import { Memory } from '@/index'
import type { Database, LLM } from '@/types'
// import { format } from '@/utils/string'
import chalk from 'chalk'
import { EXAMPLES } from './examples'

export const runMultiTurnExamples = async ({ db, model }: { model: LLM; db: Database }) => {
	const memory = new Memory({ model, db })

	let totalFacts = 0
	let totalRecall = 0
	let totalAttempts = 0

	for await (const eg of EXAMPLES.slice(0, 1)) {
		await db.tag.deleteMany()
		await db.fact.deleteMany()
		await db.relationship.deleteMany()

		for await (const message of eg.messages) {
			totalFacts += message.facts.length

			console.log(chalk.yellow(`\n\n"${message.content}"`))

			// Clean up DB in between conversations
			const omitted: number[] = []

			const { facts: attempts } = await memory.ingest({
				content: message.content
			})

			// for (const [i, fact] of message.facts.entries()) {
			let correctFacts = 0

			// 	console.log(
			// 		`\n🎯 ${i + 1} of ${message.facts.length}: ${chalk.magenta(fact.subject)} ${chalk.yellow(fact.relation)} ${chalk.blue(fact.object)}`
			// 	)

			// 	const newFacts = await db.fact.findMany()

			// 	for (const [k, newFact] of newFacts.entries()) {
			// 		const { subject, relation, object } = newFact

			// 		const correctSubject = fact.subject === subject
			// 		const correctRelation = fact.relation === relation
			// 		const correctObject = fact.object === object

			// 		if (omitted.includes(k)) {
			// 			console.log(
			// 				chalk.blackBright.italic(
			// 					`🤖 ${k + 1} of ${newFacts.length}: ${subject} ${relation} ${object}`
			// 				)
			// 			)
			// 			continue
			// 		}

			// 		console.log(
			// 			`🤖 ${k + 1} of ${newFacts.length}: ${chalk.magenta(format(subject, correctSubject))} ${chalk.yellow(
			// 				format(relation, correctRelation)
			// 			)} ${chalk.blue(format(object, correctObject))}`
			// 		)

			correctFacts += 0 //Number(correctSubject && correctRelation && correctObject)

			// 		if (correctFacts) {
			// 			omitted.push(k)
			// 			break
			// 		}
			// 	}

			totalRecall += correctFacts
			// }

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
