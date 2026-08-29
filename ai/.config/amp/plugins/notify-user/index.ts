import type { PluginAPI, PluginToolContext } from '@ampcode/plugin'

export const description = 'Lets an agent thread send a concise notification to the Amp user.'

type NotifyInput = {
	message: string
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
}

export const testables = { notifyUser }
