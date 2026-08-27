import type { PluginAPI } from '@ampcode/plugin'

export const description =
	'Starts an unparented delivery coordinator in an orb for an explicitly selected planning thread.'

function coordinatorPrompt(planningThreadId: string): string {
	return [
		'You are the delivery coordinator for a completed planning thread.',
		`Planning thread: ${planningThreadId}`,
		'',
		'Read the complete planning thread before you act.',
		'Load the coordinating-deliveries skill and follow its Run the Delivery workflow.',
		'You own the planned outcome through completed pull requests and verified rollout.',
		'Coordinate PR-sized child threads, including in other projects when required.',
		'Keep no more than five active worker threads and five open delivery pull requests.',
		'Do not parallelize work that can conflict. Archive workers as their pull requests merge or their work safely becomes irrelevant.',
		'This is already the top-level coordinator thread. Do not start another coordinator.',
	].join('\n')
}

export default function (amp: PluginAPI) {
	amp.registerTool({
		name: 'start_delivery_coordinator',
		description:
			'Start one unparented top-level delivery coordinator in an orb for the current planning thread. Call only when the user explicitly requests a delivery coordinator.',
		inputSchema: {
			type: 'object',
			properties: {},
			additionalProperties: false,
		},
		async execute(_input, ctx) {
			const planningThreadId = ctx.thread.id
			const agent = amp.getBuiltinAgent('high')
			const coordinator = await agent.createThread({ executor: 'orb', show: true })

			await coordinator.appendUserMessage({
				type: 'user-message',
				content: coordinatorPrompt(planningThreadId),
			})

			return `Started top-level delivery coordinator ${coordinator.id} for planning thread ${planningThreadId}.`
		},
	})
}
