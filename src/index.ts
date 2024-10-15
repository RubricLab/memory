import { openai } from '@ai-sdk/openai'
import { Prisma, PrismaClient } from '@prisma/client'
import {
	createVectorExtension,
	createVectorIndex,
	searchVector,
	setMaxWorkers,
	setWorkerMemory
} from '@prisma/client/sql'
import { generateObject } from 'ai'
import chalk from 'chalk'
import { z } from 'zod'
import type { Database, LLM } from './types'
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
		const ids = tags.map(() => uid())
		const vectors = await this.embed({ texts: tags })
		const vectorStrings = vectors.map(v => JSON.stringify(v))
		const rows = tags.map((t, i) => `('${ids[i]}', '${t}', '${vectorStrings[i]}', ${userId})`)

		const template = clean`insert into tag (id, body, vector, "userId")
			values
				${rows.join(', ')}
			on conflict (body, "userId") do nothing
			returning id`

		const query = Prisma.sql([template])

		const inserted: { id: string }[] = await this.db.$queryRaw(query)

		return inserted
	}

	async search(
		query: string,
		{ threshold = 0.5, limit = 10, userId = this.userId }
	): Promise<searchVector.Result[]> {
		const vector = await this.embed({ text: query })
		const sql = searchVector(vector as unknown as string, threshold, limit, userId)
		const res = await this.db.$queryRawTyped(sql)

		return res
	}

	async getAll({ where, userId = this.userId }: { where?: { tags: string[] }; userId: string }) {
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

		const similarTagSearchRes = await Promise.all(uniqueTags.map(tag => this.search(tag, { userId })))
		const similarTags = similarTagSearchRes.flat()

		console.log(`search completed: ${(performance.now() - start).toFixed(2)}ms`)

		const uniqueSimilarTagIds = [...new Set(similarTags.map(s => s.id))]
		console.log('similarTags', similarTags)

		const netNewTags = uniqueTags.filter(t => !similarTags.some(s => s?.body === t))
		console.log('netNewTags', netNewTags)

		const tagsInserted = await this.insert({ tags: netNewTags }, { userId })
		const netNewTagIds = tagsInserted.map(t => t.id)

		console.log(`insert completed: ${(performance.now() - start).toFixed(2)}ms`)

		const combinedTagIds = [...uniqueSimilarTagIds, ...netNewTagIds]

		const relatedFacts = await this.db.relationship.findMany({
			where: {
				tag: {
					id: {
						in: combinedTagIds
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
				corrections: z
					.array(
						z.object({
							index: z.number(),
							newStatement: z.string()
						})
					)
					.optional()
			}),
			prompt: clean`Given the following statements and some new information, please identify any statements which have been falsified.

				Prior statements:
				"""
				${relatedFacts.map((r, i) => `${i}. ${r.fact.body}`).join('\n')}
				"""

				New information:
				"""
				${facts.map(f => `- ${f}`).join('\n')}
				"""
				
				It is not always necessary to update the returned statements.
				`
		})

		console.log('corrections', corrections)
		console.log(`made corrections: ${(performance.now() - start).toFixed(2)}ms`)

		const updates =
			corrections?.flatMap(({ index, newStatement }) => {
				const outdated = relatedFacts[index]

				if (!outdated) return []

				return this.db.relationship.update({
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
			}) || []

		const creates = facts.flatMap(fact => {
			return combinedTagIds.map(tagID =>
				this.db.relationship.create({
					data: {
						fact: {
							connectOrCreate: {
								where: {
									userId_body: {
										body: fact,
										userId
									}
								},
								create: {
									body: fact,
									userId
								}
							}
						},
						tag: {
							connect: {
								id: tagID,
								userId
							}
						},
						userId
					}
				})
			)
		})

		const created = await this.db.$transaction([...updates, ...creates])

		console.log(chalk.green(`Added ${created?.length} facts`))

		console.log(`Completed in ${(performance.now() - start).toFixed(2)}ms`)

		return { tags, facts }
	}
}
