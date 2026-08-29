import type { PluginAPI, PluginToolContext } from '@ampcode/plugin'

export const description =
	'Grills plans with focused decision dialogs that offer concrete choices and a free-text answer.'

type QuestionInput = {
	title: string
	question: string
	options: string[]
	recommendation: string
	tradeoff: string
}

function dialogMessage(input: QuestionInput): string {
	return [
		input.question,
		`**Recommend:** ${input.recommendation}`,
		`**Main tradeoff:** ${input.tradeoff}`,
	].join('\n\n')
}

async function askQuestion(
	amp: PluginAPI,
	input: QuestionInput,
	ctx: PluginToolContext,
): Promise<string> {
	try {
		const answer = await ctx.ui.select({
			title: input.title,
			message: dialogMessage(input),
			options: input.options,
			allowOther: true,
			initialValue: input.options.includes(input.recommendation)
				? input.recommendation
				: undefined,
		})

		return answer === undefined
			? 'The user cancelled this question. Stop the interrogation and summarize the decisions and open blockers so far.'
			: `The user answered: ${answer}`
	} catch (error) {
		if (error instanceof Error && amp.helpers.isPluginUINotAvailableError(error)) {
			return [
				'Interactive UI is not available. Ask this question directly in chat instead.',
				dialogMessage(input),
				`Options: ${input.options.join(' | ')}`,
			].join('\n\n')
		}
		throw error
	}
}

export default async function (amp: PluginAPI) {
	amp.registerTool({
		name: 'ask_grill_question',
		title: 'Ask planning question',
		transcriptGroup: { active: 'Grilling the plan', complete: 'Grilled the plan' },
		description:
			'Ask one material planning question in an interactive dialog. Give concrete choices and a recommendation. The user can select a choice or enter a free-text answer. Use only while the grilling-plans skill is active.',
		inputSchema: {
			type: 'object',
			properties: {
				title: {
					type: 'string',
					description: 'Short name for the decision, suitable for a dialog title.',
				},
				question: {
					type: 'string',
					description: 'One self-contained question about a material decision.',
				},
				options: {
					type: 'array',
					items: { type: 'string' },
					minItems: 2,
					maxItems: 5,
					description: 'Distinct, concrete answers. Include the recommended answer.',
				},
				recommendation: {
					type: 'string',
					description:
						'The recommended answer. It must exactly match one option so the UI can preselect it.',
				},
				tradeoff: {
					type: 'string',
					description: 'The main consequence or tradeoff that makes this decision material.',
				},
			},
			required: ['title', 'question', 'options', 'recommendation', 'tradeoff'],
			additionalProperties: false,
		},
		execute: (input, ctx) => askQuestion(amp, input as QuestionInput, ctx),
	})

	await amp.registerSkill({ path: 'skills/grilling-plans' })
}

export const testables = { askQuestion, dialogMessage }
