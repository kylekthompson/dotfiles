// @amp-agent-mode {"key":"sol-xhigh-high","label":"sol-xhigh-high"}
// @amp-agent-mode {"key":"sol-xhigh-med","label":"sol-xhigh-med"}
// @amp-agent-mode {"key":"sol-high-high","label":"sol-high-high"}
// @amp-agent-mode {"key":"sol-high-med","label":"sol-high-med"}

import type { PluginAPI } from '@ampcode/plugin'

export default function (amp: PluginAPI) {
	const highOracle = amp.createAgent({
		name: 'sol-high-oracle',
		model: 'openai/gpt-5.6-sol',
		instructions: [
			'You are a read-only expert reviewer for hard judgment calls, tricky reviews, alternative analysis, and complex plans.',
			'Inspect the relevant code and return a focused recommendation with concrete evidence.',
		].join(' '),
		tools: {
			include: 'all',
			exclude: ['apply_patch', 'create_file', 'edit_file', 'oracle', 'painter', 'Task', 'sol_high_oracle'],
		},
		reasoningEffort: 'high',
	})

	amp.registerTool({
		name: 'sol_high_oracle',
		description: 'Consult a read-only GPT-5.6 Sol expert using high reasoning effort.',
		inputSchema: {
			type: 'object',
			properties: {
				task: {
					type: 'string',
					description: 'The focused review, decision, planning, or debugging question.',
				},
			},
			required: ['task'],
		},
		async execute(input, ctx) {
			const task = typeof input.task === 'string' ? input.task : ''
			if (!task.trim()) return 'Missing task.'

			const result = await highOracle.run(task, {
				parentThreadID: ctx.thread.id,
				timeoutMs: 10 * 60 * 1000,
			})
			return result.text
		},
	})

	const modes = [
		{ key: 'sol-xhigh-high', oracleEffort: 'xhigh', agentEffort: 'high' },
		{ key: 'sol-xhigh-med', oracleEffort: 'xhigh', agentEffort: 'medium' },
		{ key: 'sol-high-high', oracleEffort: 'high', agentEffort: 'high' },
		{ key: 'sol-high-med', oracleEffort: 'high', agentEffort: 'medium' },
	] as const

	for (const { key, oracleEffort, agentEffort } of modes) {
		const oracleTool = oracleEffort === 'xhigh' ? 'oracle' : 'sol_high_oracle'
		const agent = amp.createAgent({
			name: key,
			model: 'openai/gpt-5.6-sol',
			instructions: `Use ${oracleTool} for difficult judgment calls that benefit from additional reasoning.`,
			tools: oracleEffort === 'xhigh' ? 'all' : { include: 'all', exclude: ['oracle'] },
			reasoningEffort: agentEffort,
		})

		amp.registerAgentMode({
			key,
			label: key,
			description: `GPT-5.6 Sol at ${agentEffort} effort with ${oracleEffort} Oracle.`,
			agent: agent.definition,
		})
	}
}
