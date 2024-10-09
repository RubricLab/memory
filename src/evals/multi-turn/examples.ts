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
				content: 'I now eat meat',
				facts: [
					{
						subject: 'user',
						relation: 'is not',
						object: 'vegan'
					},
					{
						subject: 'user',
						relation: 'eats',
						object: 'meat'
					}
				]
			}
		]
	},
	{
		messages: [
			{
				content: 'I went to Balthazar with George on the 10th of March 2024',
				facts: [
					{
						subject: 'user',
						relation: 'went to',
						object: 'Balthazar'
					},
					{
						subject: 'user',
						relation: 'went with',
						object: 'George'
					}
				]
			},
			{
				content: 'George liked the food',
				facts: [
					{
						subject: 'George',
						relation: 'liked',
						object: 'Balthazar'
					}
				]
			}
		]
	},
	{
		messages: [
			{
				content: 'I have a cousin named Suzy',
				facts: [
					{
						subject: 'user',
						relation: 'has a cousin named',
						object: 'Suzy'
					}
				]
			},
			{
				content: 'Suzy does not like cranberries',
				facts: [
					{
						subject: 'Suzy',
						relation: 'does not like',
						object: 'cranberries'
					}
				]
			}
		]
	}
]
