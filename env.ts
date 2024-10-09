import { createEnv } from '@t3-oss/env-nextjs'
import z from 'zod'

export default createEnv({
	runtimeEnv: {
		OPENAI_API_KEY: process.env.OPENAI_API_KEY
	},
	server: {
		OPENAI_API_KEY: z.string().min(1)
	}
})
