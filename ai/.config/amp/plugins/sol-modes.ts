// @amp-agent-mode {"key":"sol-high","label":"sol-high"}
// @amp-agent-mode {"key":"sol-medium","label":"sol-medium"}

import type { PluginAPI } from '@ampcode/plugin'

export default function (amp: PluginAPI) {
	for (const reasoningEffort of ['high', 'medium'] as const) {
		const key = `sol-${reasoningEffort}`
		const agent = amp.createAgent({
			name: key,
			model: 'openai/gpt-5.6-sol',
			instructions: 'Use Oracle for difficult judgment calls that benefit from xhigh reasoning.',
			tools: 'all',
			reasoningEffort,
		})

		amp.registerAgentMode({
			key,
			label: key,
			description: `GPT-5.6 Sol at ${reasoningEffort} effort with xhigh Oracle.`,
			agent: agent.definition,
		})
	}
}
