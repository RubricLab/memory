import { openai } from '@ai-sdk/openai'
import {
	createVectorExtension,
	createVectorIndex,
	insertVector,
	searchVector,
	setMaxWorkers,
	setWorkerMemory
} from '@prisma/client/sql'
import { generateObject } from 'ai'
import { z } from 'zod'
import type { Database, LLM } from './types'
import { clean } from './utils/string'
import { uid } from './utils/uid'

export class Memory {
	model: LLM
	db: Database
	EMBEDDINGS_MODEL = 'text-embedding-3-small'
	EMBEDDINGS_DIMENSIONS = 768

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
		db
	}: {
		model?: LLM
		db: Database
	}) {
		this.model = model
		this.db = db

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
			Portray the first-person as "user".
			In case of contradiction, try to capture the most up-to-date state of affairs in present tense.
			Passage:
			"${content}"`
		})

		return { facts: facts.map(({ body }) => body) }
	}

	async extractTags({ content }: { content: string }): Promise<{ tags: string[] }> {
		const {
			object: { entities }
		} = await generateObject({
			model: openai(this.model),
			schema: z.object({
				entities: z.array(
					z.object({
						body: z.string()
					})
				)
			}),
			prompt: clean`Please extract all entities (subjects, objects, and general metaphysical concepts) from the following passage.
				Portray the first-person as "user".
				Passage:
				"${content}"`
		})

		const tags = entities?.map(({ body }) => body)

		return { tags }
	}

	async embed(text: string): Promise<number[]> {
		const res = await openai
			.embedding(this.EMBEDDINGS_MODEL, {
				dimensions: this.EMBEDDINGS_DIMENSIONS
			})
			.doEmbed({ values: [text] })

		if (!res) throw 'Failed to reach embeddings API'

		const { embeddings } = res

		if (!embeddings[0]) throw 'No embedding found'

		return embeddings[0]
	}

	async insert(body: string) {
		const vector = await this.embed(body)

		const id = uid()

		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		const query = insertVector(id, body, vector as any)
		const inserted: insertVector.Result[] = await this.db.$queryRawTyped(query)

		return inserted
	}

	async search(
		query: string,
		{ threshold, limit } = { threshold: 0.5, limit: 10 }
	): Promise<searchVector.Result[]> {
		const vector = await this.embed(query)

		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		return await this.db.$queryRawTyped(searchVector(vector as any, threshold, limit))
	}

	async ingest({ content }: { content: string }) {
		const [{ tags }, { facts }] = await Promise.all([
			this.extractTags({ content }),
			this.extractFacts({ content })
		])

		const uniqueTags = [...new Set(tags)]

		const similarTags = await Promise.all(uniqueTags.map(tag => this.search(tag)))
		const similarTagIds = similarTags.flatMap(t => t[0]?.id || [])
		console.log('similarTags', similarTags)

		const netNewTags = uniqueTags.filter(t => !similarTags.some(s => s[0]?.body === t))
		console.log({ netNewTags })

		const tagsInserted = await Promise.all(netNewTags.map(tag => this.insert(tag)))
		const netNewTagIds = tagsInserted.flatMap(t => t[0]?.id || [])

		if (!netNewTagIds?.[0]) throw 'Failed to insert tags'

		const allTagIds = [...similarTagIds, ...netNewTagIds]

		const creates = facts.flatMap(fact => {
			return allTagIds.map(tagID =>
				this.db.relationship.create({
					data: {
						fact: {
							connectOrCreate: {
								where: {
									body: fact
								},
								create: {
									body: fact
								}
							}
						},
						tag: {
							connect: {
								id: tagID
							}
						}
					}
				})
			)
		})

		const created = await this.db.$transaction(creates)
		console.log({ created })

		const relatedFacts = await this.db.relationship.findMany({
			where: {
				tag: {
					id: {
						in: allTagIds
					}
				}
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

		console.log('relatedFacts', relatedFacts)

		return { tags, facts }
	}
}
