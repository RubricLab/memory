import type { Fact } from '@/types'

type Example = {
	content: string
	facts: Fact[]
}

export const EXAMPLES: Example[] = [
	{
		content: 'I went to Balthazar with George on the 10th of March 2024',
		facts: [
			{
				subject: 'user',
				relation: 'went to',
				object: 'Balthazar',
				data: {
					date: '2024-03-10'
				}
			},
			{
				subject: 'user',
				relation: 'was with',
				object: 'George',
				data: {
					date: '2024-03-10'
				}
			}
		]
	},
	{
		content: 'my cousin Suzy does not like cranberries',
		facts: [
			{
				subject: 'Suzy',
				relation: 'does not like',
				object: 'cranberries'
			},
			{
				subject: 'Suzy',
				relation: 'is',
				object: "user's cousin"
			}
		]
	},
	{
		content: 'I am vegan... (2 hours later)... I am not vegan.',
		facts: [
			{
				subject: 'user',
				relation: 'is not',
				object: 'vegan'
			}
		]
	}
]
