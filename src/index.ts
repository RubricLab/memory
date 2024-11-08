import { openai } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import chalk from 'chalk'
import { Kysely, PostgresDialect, sql } from 'kysely'
import { Pool } from 'pg'
import { z } from 'zod'
import env from '../env'
import {
	createVectorExtension,
	createVectorIndex,
	setMaxWorkers,
	setWorkerMemory
} from './db/scripts'
import type { Database, LLM, Schema, SearchResult } from './types'
import { clean } from './utils/string'
import { uid } from './utils/uid'

export class Memory {
	model: LLM
	db: Database
	userId: string
	embeddingsModel: string
	embeddingsDimension: number

	async initVectorIndex() {
		await this.db.executeQuery(createVectorExtension.compile(this.db))
		await Promise.all([
			this.db.executeQuery(setMaxWorkers.compile(this.db)),
			this.db.executeQuery(setWorkerMemory.compile(this.db)),
			this.db.executeQuery(createVectorIndex.compile(this.db))
		])
	}

	constructor({
		model = 'gpt-4o-mini',
		db = new Kysely<Schema>({
			dialect: new PostgresDialect({
				pool: new Pool({
					connectionString: env.DATABASE_URL
				})
			})
		}),
		userId = uid(),
		embeddingsModel = 'text-embedding-3-small',
		embeddingsDimension = 768
	}: {
		model?: LLM
		db?: Database
		userId?: string
		embeddingsModel?: string
		embeddingsDimension?: number
	} = {}) {
		this.model = model
		this.db = db
		this.userId = userId
		this.embeddingsModel = embeddingsModel
		this.embeddingsDimension = embeddingsDimension

		// TODO: figure out how to do this once during setup
		// this.initVectorIndex()
	}

	async extractFacts({ content }: { content: string }): Promise<{ facts: string[] }> {
		const {
			object: { facts }
		} = await generateObject({
			model: openai(this.model),
			schema: z.object({
				facts: z.array(
					z.object({
						body: z.string()
					})
				)
			}),
			prompt: clean`Please extract interesting facts from the following passage if they teach us something about the user.
				In case of first-person statements, portray the first-person as "user".
				In case of second-person statements, refer to yourself as "system".
				In case of third-person statements, portray the third-party directly.
				In case of contradiction, try to capture the most up-to-date state of affairs in present tense.
				In the case where no new information is to be gained or the user is simply asking a question, please respond with an empty array.
				Passage:
				"${content}"`
		})

		return { facts: facts?.map(({ body }) => body) }
	}

	async extractTags({ content }: { content: string }): Promise<{ tags: string[] }> {
		const {
			object: { entities: tags }
		} = await generateObject({
			model: openai(this.model),
			schema: z.object({
				entities: z.array(z.string())
			}),
			prompt: clean`Please extract all entities (subjects, objects, and general metaphysical concepts) from the following passage.
				In case of first-person statements, portray the first-person as "user".
				Passage:
				"${content}"`
		})

		return { tags }
	}

	embed(props: { text: string }): Promise<number[]>
	embed(props: { texts: string[] }): Promise<number[][]>
	async embed(props: { text: string } | { texts: string[] }) {
		const texts = 'texts' in props ? props.texts : [props.text]

		const res = await openai
			.embedding(this.embeddingsModel, {
				dimensions: this.embeddingsDimension
			})
			.doEmbed({ values: texts })

		if (!res) throw 'Failed to reach embeddings API'

		const { embeddings } = res

		if (!embeddings || embeddings?.length === 0) throw 'No embedding found'

		return 'texts' in props ? embeddings : embeddings[0]
	}

	async insert(
		props: { tag: string } | { tags: string[] },
		{ userId = this.userId }: { userId?: string }
	) {
		const tags = 'tags' in props ? props.tags : [props.tag]

		if (tags.length === 0) return []

		const vectors = await this.embed({ texts: tags })

		const values = tags.map((t, i) => ({
			id: uid(),
			body: t,
			vector: JSON.stringify(vectors[i]),
			userId
		}))

		const inserted = await this.db
			.insertInto('tag')
			.columns(['id', 'body', 'vector', 'userId'])
			.values(values)
			.onConflict(oc => oc.columns(['body', 'userId']).doNothing())
			.returning('id')
			.execute()

		return inserted
	}

	async search(
		query: string,
		{ threshold = 0.5, limit = 10, userId = this.userId }
	): Promise<SearchResult[]> {
		const vector = await this.embed({ text: query })
		const res = await this.db
			.withRecursive('subquery', db => {
				return db
					.selectFrom('tag')
					.innerJoin('relationship', 'relationship.tagId', 'tag.id')
					.innerJoin('fact', 'fact.id', 'relationship.factId')
					.select([
						'tag.id as tagId',
						'tag.body as tagBody',
						'fact.id as factId',
						'fact.body as factBody',
						sql<number>`1 - (tag.vector <=> ${JSON.stringify(vector)}::vector)`.as('similarity')
					])
					.where('relationship.userId', '=', userId)
					.where('tag.vector', 'is not', null)
			})
			.selectFrom('subquery')
			.selectAll()
			.where('similarity', '>', threshold)
			.orderBy('similarity', 'desc')
			.limit(limit)
			.execute()

		return res
	}

	async getAll({ where, userId = this.userId }: { where?: { tags: string[] }; userId: string }) {
		const relations = await this.db
			.selectFrom('relationship')
			.leftJoin('fact', 'relationship.factId', 'fact.id')
			.leftJoin('tag', 'relationship.tagId', 'tag.id')
			.select(['fact.body as factBody', 'tag.body as tagBody'])
			.where(expression => {
				const conditions = expression.and([expression('relationship.userId', '=', userId)])

				if (where?.tags && where.tags.length > 0) {
					conditions.and('tag.body', 'in', where.tags)
				}

				return conditions
			})
			.execute()

		const processedRelations = relations.map(relation => ({
			fact: { body: relation.factBody || '' },
			tag: { body: relation.tagBody || '' }
		}))

		return processedRelations
	}

	async ingest({ content, userId = this.userId }: { content: string; userId?: string }) {
		const start = performance.now()

		const [{ tags }, { facts }] = await Promise.all([
			this.extractTags({ content }),
			this.extractFacts({ content })
		])

		console.log('facts', facts)
		console.log('tags', tags)

		console.log(`extract completed: ${(performance.now() - start).toFixed(2)}ms`)

		const uniqueTags = Array.from(new Set(tags))
		const similarTagSearchRes = await Promise.all(uniqueTags.map(tag => this.search(tag, { userId })))
		console.log(`search completed: ${(performance.now() - start).toFixed(2)}ms`)

		const similarTags = similarTagSearchRes.flat()
		console.log('similarTags', similarTags)

		const uniqueSimilarTagIds = Array.from(new Set(similarTags.map(s => s.tagId)))

		// Add duplicate detection
		const {
			object: { duplicates }
		} = await generateObject({
			model: openai(this.model),
			schema: z.object({
				duplicates: z.array(
					z.object({
						newTag: z.string(),
						existingTag: z.string(),
						confidence: z.number().min(0).max(1)
					})
				)
			}),
			prompt: clean`Please identify any duplicate tags from the following lists, accounting for variations in spelling, nicknames, or formatting.
				Only mark as duplicates if you are highly confident they refer to the same entity.
				
				Existing tags:
				${similarTags.map(s => s.tagBody).join('\n')}
				
				New tags:
				${uniqueTags.join('\n')}
				
				Return pairs of duplicates with a confidence score.
				A confidence of 0.9+ means very likely match (e.g., "NYC" vs "New York City")`
		})

		const CONFIDENCE_THRESHOLD = 0.5

		// Filter out duplicates, keeping existing tags when there's a match
		const netNewTags = uniqueTags.filter(
			t =>
				!similarTags.some(s => s.tagBody.toLowerCase() === t.toLowerCase()) && // exact match check
				!duplicates.some(d => d.newTag === t && d.confidence >= CONFIDENCE_THRESHOLD) // AI-detected duplicate check
		)

		// Replace any remaining new tags with their existing versions if they're duplicates
		const finalTags = netNewTags.map(tag => {
			const duplicate = duplicates.find(d => d.newTag === tag && d.confidence >= CONFIDENCE_THRESHOLD)
			return duplicate ? duplicate.existingTag : tag
		})

		console.log('netNewTags', finalTags)

		const tagsInserted = await this.insert({ tags: finalTags }, { userId })
		const netNewTagIds = tagsInserted.map(t => t.id)

		console.log(`insert completed: ${(performance.now() - start).toFixed(2)}ms`)

		const combinedTagIds = [...uniqueSimilarTagIds, ...netNewTagIds]

		const relatedFacts = await this.db
			.selectFrom('fact')
			.innerJoin('relationship', 'fact.id', 'relationship.factId')
			.select(['fact.id', 'fact.body'])
			.where('relationship.tagId', 'in', combinedTagIds)
			.distinct()
			.execute()

		console.log('relatedFacts', relatedFacts)

		let toDelete: { index: number }[] = []
		if (relatedFacts && relatedFacts.length > 0) {
			const { object } = await generateObject({
				model: openai(this.model),
				schema: z.object({
					statements: z
						.array(
							z.object({
								index: z.number(),
								shouldBeDeleted: z.boolean().default(false),
								rationale: z
									.string()
									.describe('A maximum one-sentence rationale for why the statement should be deleted')
							})
						)
						.default([])
				}),
				prompt: clean`Given the following facts and some new information, please identify any existing facts that have been proven wrong by the new information.
				You should only delete facts that have been overwritten by the new facts.
				This means it is common to not delete anything.

				Existing facts:
				${relatedFacts.map((r, i) => `${i}. ${r.body}`).join('\n')}

				New information:
				${facts.map(f => `- ${f}`).join('\n')}
				
				Chosen statements will be deleted permanently. Only delete them if certain!
				Take a breath. Let's think this through.
				`
			})
			toDelete = object.statements.filter(s => s.shouldBeDeleted)
		}

		console.log('toDelete', toDelete)
		console.log(`identified deletions: ${(performance.now() - start).toFixed(2)}ms`)

		await this.db.transaction().execute(async trx => {
			const deletePromises =
				toDelete?.flatMap(({ index }) => {
					const outdated = relatedFacts?.[index]
					if (!outdated) return []

					return trx.deleteFrom('fact').where('id', '=', outdated.id).execute()
				}) || []

			const createPromises = facts.flatMap(fact =>
				combinedTagIds.flatMap(async tagId => {
					const [createdFact] = await trx
						.insertInto('fact')
						.values({ id: uid(), body: fact, userId })
						.onConflict(oc => oc.columns(['userId', 'body']).doUpdateSet({ body: fact }))
						.returning('id')
						.execute()

					if (!createdFact) return []
					return trx
						.insertInto('relationship')
						.values({
							id: uid(),
							factId: createdFact.id,
							tagId,
							userId
						})
						.execute()
				})
			)

			return await Promise.all([...deletePromises, ...createPromises])
		})

		console.log(chalk.green(`Added ${facts.length} facts`))
		console.log(chalk.yellow(`Updated ${toDelete.length} facts`))

		console.log(`Completed in ${(performance.now() - start).toFixed(2)}ms`)

		return { tags, facts }
	}
}
