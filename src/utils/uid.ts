import { customAlphabet } from 'nanoid'

// 1% chance of collision in 8B IDs: zelark.github.io/nano-id-cc
const DEFAULT_LENGTH = 12

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ')

export const uid = (length = DEFAULT_LENGTH) => nanoid(length)
