import type { openai } from '@ai-sdk/openai'

export type Fact = {
	subject: string
	relation: string
	object: string
	data?: Record<string, string>
}

export type Database = {
	execute: (cmd: string) => Promise<unknown>
}

export type LLM = Parameters<typeof openai>[0]
