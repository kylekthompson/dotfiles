import { describe, expect, test } from 'bun:test'
import type { PluginAPI, PluginToolContext } from '@ampcode/plugin'
import { testables } from './index'

const input = {
	title: 'Compatibility policy',
	question: 'Must old clients remain supported?',
	options: ['Yes, preserve compatibility', 'No, require an upgrade'],
	recommendation: 'Yes, preserve compatibility',
	tradeoff: 'Compatibility adds implementation and test work.',
}

describe('askQuestion', () => {
	test('presents choices, preselects the recommendation, and allows free text', async () => {
		let received: Record<string, unknown> | undefined
		const ctx = {
			ui: {
				select: async (options: Record<string, unknown>) => {
					received = options
					return 'Only for the previous release'
				},
			},
		} as unknown as PluginToolContext
		const amp = {
			helpers: { isPluginUINotAvailableError: () => false },
		} as unknown as PluginAPI

		const result = await testables.askQuestion(amp, input, ctx)

		expect(received).toMatchObject({
			title: input.title,
			options: input.options,
			allowOther: true,
			initialValue: input.recommendation,
		})
		expect(received?.message).toContain(input.question)
		expect(received?.message).toContain(input.tradeoff)
		expect(result).toBe('The user answered: Only for the previous release')
	})

	test('falls back to a normal chat question when UI is unavailable', async () => {
		const unavailable = new Error('No active UI')
		const ctx = {
			ui: { select: async () => Promise.reject(unavailable) },
		} as unknown as PluginToolContext
		const amp = {
			helpers: { isPluginUINotAvailableError: (error: Error) => error === unavailable },
		} as unknown as PluginAPI

		const result = await testables.askQuestion(amp, input, ctx)

		expect(result).toContain('Ask this question directly in chat')
		expect(result).toContain(input.question)
		expect(result).toContain(input.options.join(' | '))
	})

	test('treats cancellation as a request to stop grilling', async () => {
		const ctx = {
			ui: { select: async () => undefined },
		} as unknown as PluginToolContext
		const amp = {
			helpers: { isPluginUINotAvailableError: () => false },
		} as unknown as PluginAPI

		expect(await testables.askQuestion(amp, input, ctx)).toContain(
			'Stop the interrogation',
		)
	})
})
