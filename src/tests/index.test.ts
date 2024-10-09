import { expect, test } from 'bun:test'
import { memory } from '@'

test('exports a function', () => {
	expect(typeof memory).toBe('function')
})
