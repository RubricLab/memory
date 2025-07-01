import { createEnv } from '@t3-oss/env-nextjs'
import z from 'zod'

export default createEnv({
	runtimeEnv: {
		DATABASE_URL: process.env.DATABASE_URL,
		OPENAI_API_KEY: process.env.OPENAI_API_KEY
	},
	server: {
		DATABASE_URL: z.string().min(1),
		OPENAI_API_KEY: z.string().min(1)
	}
})
