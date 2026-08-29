import type { PluginAPI, PluginToolContext } from '@ampcode/plugin'

export const description =
	'Lets an agent thread notify the Amp user or ask the user a concise question.'

type NotifyInput = {
	message: string
}

type QuestionInput = {
	question: string
}

async function notifyUser(
	amp: PluginAPI,
	input: NotifyInput,
	ctx: PluginToolContext,
): Promise<string> {
	const message = input.message.trim()
	if (message.length === 0 || message.length > 500) {
		return 'Notification was not sent. The message must contain 1–500 non-whitespace characters.'
	}

	try {
		await ctx.ui.notify(message)
		return 'Notification sent to the user.'
	} catch (error) {
		if (error instanceof Error && amp.helpers.isPluginUINotAvailableError(error)) {
			return 'Notification was not sent because plugin UI is unavailable in this Amp client.'
		}
		if (error instanceof Error && error.name === 'AbortError') {
			return 'The notification request was cancelled. Delivery is not confirmed.'
		}

		const detail = error instanceof Error ? error.message : String(error)
		return `The notification request failed: ${detail}. Delivery is not confirmed.`
	}
}

async function askUserQuestion(
	amp: PluginAPI,
	input: QuestionInput,
	ctx: PluginToolContext,
): Promise<string> {
	const question = input.question.trim()
	if (question.length === 0 || question.length > 500) {
		return 'The question was not shown. It must contain 1–500 non-whitespace characters.'
	}

	try {
		const answer = await ctx.ui.input({
			title: 'Agent question',
			helpText: question,
			submitButtonText: 'Answer',
		})
		if (answer === undefined) return 'The user cancelled the question without answering.'

		const trimmedAnswer = answer.trim()
		return trimmedAnswer.length === 0
			? 'The user submitted an empty answer.'
			: `The user answered: ${trimmedAnswer}`
	} catch (error) {
		if (error instanceof Error && amp.helpers.isPluginUINotAvailableError(error)) {
			return `Interactive UI is unavailable. Ask the user directly in chat instead: ${question}`
		}
		if (error instanceof Error && error.name === 'AbortError') {
			return 'The question was cancelled without an answer.'
		}

		const detail = error instanceof Error ? error.message : String(error)
		return `The question failed: ${detail}. No answer was received.`
	}
}

export default function (amp: PluginAPI) {
	amp.registerTool({
		name: 'notify_user',
		title: 'Notify user',
		description:
			'Send the Amp user a notification with a concise message. Use only when the thread needs to explicitly draw the user’s attention.',
		inputSchema: {
			type: 'object',
			properties: {
				message: {
					type: 'string',
					minLength: 1,
					maxLength: 500,
					description: 'Concise notification text for the user.',
				},
			},
			required: ['message'],
			additionalProperties: false,
		},
		execute: (input, ctx) => notifyUser(amp, input as NotifyInput, ctx),
	})

	amp.registerTool({
		name: 'ask_user_question',
		title: 'Ask user question',
		description:
			'Ask the Amp user one concise free-text question in an interactive dialog and return their answer. Use when the thread cannot continue without user input.',
		inputSchema: {
			type: 'object',
			properties: {
				question: {
					type: 'string',
					minLength: 1,
					maxLength: 500,
					description: 'One concise, self-contained question for the user.',
				},
			},
			required: ['question'],
			additionalProperties: false,
		},
		execute: (input, ctx) => askUserQuestion(amp, input as QuestionInput, ctx),
	})
}

export const testables = { askUserQuestion, notifyUser }
