import chalk from 'chalk'

export const clean = (strings: TemplateStringsArray, ...values: string[]): string => {
	return strings.reduce((result, string, i) => {
		return result + string.replaceAll('  ', '') + (values[i] || '')
	}, '')
}

export const format = (entity: string, match: boolean) =>
	match ? chalk.bgGreen(entity) : chalk.bgRed(entity)
