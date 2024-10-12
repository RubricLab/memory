import { openai } from '@ai-sdk/openai'
import { PrismaClient } from '@prisma/client'
import {
	createVectorExtension,
	createVectorIndex,
	insertVector,
	searchVector,
	setMaxWorkers,
	setWorkerMemory
} from '@prisma/client/sql'
import { generateObject } from 'ai'
import chalk from 'chalk'
import { z } from 'zod'
import { type Database, type LLM, Tag } from './types'
import { clean } from './utils/string'
import { uid } from './utils/uid'

export class Memory {
	model: LLM
	db: Database
	userId: string
	embeddingsModel: string
	embeddingsDimension: number

	async initVectorIndex() {
		await this.db.$queryRawTyped(createVectorExtension())
		await Promise.all([
			this.db.$queryRawTyped(setMaxWorkers()),
			this.db.$queryRawTyped(setWorkerMemory()),
			this.db.$queryRawTyped(createVectorIndex())
		])
	}

	constructor({
		model = 'gpt-4o-mini',
		db = new PrismaClient(),
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
			prompt: clean`Please extract all facts from the following passage.
				In case of first-person statements, portray the first-person as "user".
				In case of contradiction, try to capture the most up-to-date state of affairs in present tense.
				Passage:
				"${content}"`
		})

		return { facts: facts.map(({ body }) => body) }
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

	async embed(text: string): Promise<number[]> {
		const res = await openai
			.embedding(this.embeddingsModel, {
				dimensions: this.embeddingsDimension
			})
			.doEmbed({ values: [text] })

		if (!res) throw 'Failed to reach embeddings API'

		const { embeddings } = res

		if (!embeddings[0]) throw 'No embedding found'

		return embeddings[0]
	}

	async insert(body: string, { userId = this.userId }: { userId?: string }) {
		const id = uid()
		const vector = await this.embed(body)
		const sql = insertVector(id, body, vector as unknown as string, userId)
		const inserted = await this.db.$queryRawTyped(sql)

		return inserted
	}

	async search(
		query: string,
		{ threshold = 0.5, limit = 10, userId = this.userId }
	): Promise<searchVector.Result[]> {
		const vector = await this.embed(query)
		const sql = searchVector(vector as unknown as string, threshold, limit, userId)
		const res = await this.db.$queryRawTyped(sql)

		return res
	}

	async getAll({ where, userId = this.userId }: { where?: { tags: string[] }; userId?: string }) {
		const relations = await this.db.relationship.findMany({
			where: {
				...(where?.tags
					? {
							tag: {
								body: {
									in: where.tags
								}
							}
						}
					: {}),
				userId
			},
			select: {
				fact: {
					select: {
						body: true
					}
				},
				tag: {
					select: {
						body: true
					}
				}
			}
		})

		return relations
	}

	async ingest({ content, userId = this.userId }: { content: string; userId?: string }) {
		const start = performance.now()

		const [{ tags }, { facts }] = await Promise.all([
			this.extractTags({ content }),
			this.extractFacts({ content })
		])

		const uniqueTags = [...new Set(tags)]

		const similarTags = await Promise.all(uniqueTags.map(tag => this.search(tag, { userId })))
		const similarTagIds = similarTags
			.flat()
			.filter(s => s.body !== Tag.User)
			.map(s => s.id)
		const uniqueSimilarTagIds = [...new Set(similarTagIds)]
		console.log('similarTags', similarTags)

		const netNewTags = uniqueTags.filter(t => !similarTags.some(s => s[0]?.body === t))
		console.log('netNewTags', netNewTags)

		// TODO: use the `insert()` SQL command to return newly-created IDs
		// TODO: allow passing tag[] to insert
		const tagsInserted = await Promise.all(netNewTags.map(tag => this.insert(tag, { userId })))
		const netNewTagIds = tagsInserted.flatMap(t => t[0]?.id || [])

		const allTagIds = [...uniqueSimilarTagIds, ...netNewTagIds]

		const relatedFacts = await this.db.relationship.findMany({
			where: {
				tag: {
					id: {
						in: allTagIds
					}
				}
			},
			select: {
				id: true,
				fact: {
					select: {
						body: true
					}
				},
				tag: {
					select: {
						body: true
					}
				}
			}
		})

		console.log('relatedFacts', relatedFacts)

		const {
			object: { corrections }
		} = await generateObject({
			model: openai(this.model),
			schema: z.object({
				corrections: z.array(
					z.object({
						index: z.number(),
						newStatement: z.string()
					})
				)
			}),
			prompt: clean`Given the following statements and some new information, please identify any statements which should be updated.
				Prior statements:
				"${relatedFacts.map((r, i) => `${i + 1}. ${r.fact.body}`).join('\n')}"
				New information:
				"${facts.map(f => `- ${f}`).join('\n')}"`
		})

		console.log('corrections', corrections)

		for (const { index, newStatement } of corrections) {
			if (!relatedFacts[index]) continue

			const outdated = relatedFacts[index]

			await this.db.relationship.update({
				where: {
					id: outdated.id
				},
				data: {
					fact: {
						update: {
							body: newStatement
						}
					}
				}
			})
		}

		const creates = facts.flatMap(fact => {
			return allTagIds.map(tagID =>
				this.db.relationship.create({
					data: {
						fact: {
							connectOrCreate: {
								where: {
									userId_body: {
										userId: userId,
										body: fact
									}
								},
								create: {
									body: fact,
									userId: userId
								}
							}
						},
						tag: {
							connect: {
								id: tagID,
								userId: userId
							}
						},
						userId: userId
					}
				})
			)
		})

		const created = await this.db.$transaction(creates)

		console.log(chalk.green(`Added ${created?.length} facts`))

		console.log(`Completed in ${(performance.now() - start).toFixed(2)}ms`)

		return { tags, facts }
	}
}
