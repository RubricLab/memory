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
						object: 'vegan',
						relation: 'is',
						subject: 'user'
					}
				]
			},
			{
				content: 'I now eat meat',
				facts: [
					{
						object: 'vegan',
						relation: 'is not',
						subject: 'user'
					},
					{
						object: 'meat',
						relation: 'eats',
						subject: 'user'
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
						object: 'Balthazar',
						relation: 'went to',
						subject: 'user'
					},
					{
						object: 'George',
						relation: 'went with',
						subject: 'user'
					}
				]
			},
			{
				content: 'George liked the food',
				facts: [
					{
						object: 'Balthazar',
						relation: 'liked',
						subject: 'George'
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
						object: 'Suzy',
						relation: 'has a cousin named',
						subject: 'user'
					}
				]
			},
			{
				content: 'Suzy does not like cranberries',
				facts: [
					{
						object: 'cranberries',
						relation: 'does not like',
						subject: 'Suzy'
					}
				]
			}
		]
	}
]
