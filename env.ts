import { createEnv } from '@t3-oss/env-nextjs'
import z from 'zod'

export default createEnv({
	runtimeEnv: {
		OPENAI_API_KEY: process.env.OPENAI_API_KEY,
		DATABASE_URL: process.env.DATABASE_URL
	},
	server: {
		OPENAI_API_KEY: z.string().min(1),
		DATABASE_URL: z.string().min(1)
	}
})
