import type { Fact } from '@/types'

type Example = {
	messages: { facts: Fact[]; content: string }[]
}

export const EXAMPLES: Example[] = [
	{
		messages: [
			{
				content: 'I am vegan',
				facts: [
					{
						subject: 'user',
						relation: 'is',
						object: 'vegan'
					}
				]
			},
			{
				content: 'I am not vegan',
				facts: [
					{
						subject: 'user',
						relation: 'is not',
						object: 'vegan'
					}
				]
			}
		]
	}
]
