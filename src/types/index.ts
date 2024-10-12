import type { openai } from '@ai-sdk/openai'
import type { Prisma, PrismaClient } from '@prisma/client'
import type { DefaultArgs } from '@prisma/client/runtime/library'

export type Fact = {
	subject: string
	relation: string
	object: string
	data?: Record<string, string>
}

export type Database = PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>

export type LLM = Parameters<typeof openai>[0]

export enum Tag {
	User = 'user'
}
