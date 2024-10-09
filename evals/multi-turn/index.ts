import { EXAMPLES } from './examples'

export const runMultiTurnExamples = async ({
	fast
}: {
	fast?: boolean
}) => {
	for await (const eg of EXAMPLES) {
		console.log(eg)
	}
}
