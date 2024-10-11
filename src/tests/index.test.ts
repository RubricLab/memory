import { expect, test } from 'bun:test'
import { Memory } from '@/index'

test('exports a class', () => {
	expect(typeof Memory).toBe('function')
})
