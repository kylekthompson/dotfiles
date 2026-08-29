import { describe, expect, test } from 'bun:test'
import type { PluginAPI, PluginToolContext } from '@ampcode/plugin'
import { testables } from './index'

function ampWithUnavailableError(unavailable?: Error): PluginAPI {
	return {
		helpers: { isPluginUINotAvailableError: (error: Error) => error === unavailable },
	} as unknown as PluginAPI
}

describe('notifyUser', () => {
	test('sends a trimmed notification', async () => {
		let received: string | undefined
		const ctx = {
			ui: {
				notify: async (message: string) => {
					received = message
				},
			},
		} as unknown as PluginToolContext

		const result = await testables.notifyUser(
			ampWithUnavailableError(),
			{ message: '  Build finished  ' },
			ctx,
		)

		expect(received).toBe('Build finished')
		expect(result).toBe('Notification sent to the user.')
	})

	test('reports unavailable plugin UI without claiming delivery', async () => {
		const unavailable = new Error('No active UI')
		const ctx = {
			ui: { notify: async () => Promise.reject(unavailable) },
		} as unknown as PluginToolContext

		const result = await testables.notifyUser(
			ampWithUnavailableError(unavailable),
			{ message: 'Build finished' },
			ctx,
		)

		expect(result).toContain('was not sent')
		expect(result).toContain('plugin UI is unavailable')
	})

	test('reports a cancelled notification with uncertain delivery', async () => {
		const cancelled = new Error('Request cancelled')
		cancelled.name = 'AbortError'
		const ctx = {
			ui: { notify: async () => Promise.reject(cancelled) },
		} as unknown as PluginToolContext

		const result = await testables.notifyUser(
			ampWithUnavailableError(),
			{ message: 'Build finished' },
			ctx,
		)

		expect(result).toContain('was cancelled')
		expect(result).toContain('Delivery is not confirmed')
	})

	test('reports other errors with uncertain delivery', async () => {
		const ctx = {
			ui: { notify: async () => Promise.reject(new Error('Client disconnected')) },
		} as unknown as PluginToolContext

		const result = await testables.notifyUser(
			ampWithUnavailableError(),
			{ message: 'Build finished' },
			ctx,
		)

		expect(result).toContain('failed: Client disconnected')
		expect(result).toContain('Delivery is not confirmed')
	})

	test('rejects whitespace-only and oversized messages before calling the UI', async () => {
		let calls = 0
		const ctx = {
			ui: {
				notify: async () => {
					calls++
				},
			},
		} as unknown as PluginToolContext

		for (const message of ['   ', 'x'.repeat(501)]) {
			const result = await testables.notifyUser(
				ampWithUnavailableError(),
				{ message },
				ctx,
			)
			expect(result).toContain('must contain 1–500')
		}
		expect(calls).toBe(0)
	})
})

describe('askUserQuestion', () => {
	test('defaults to a free-text question and returns the answer', async () => {
		let received: Record<string, unknown> | undefined
		const ctx = {
			ui: {
				input: async (options: Record<string, unknown>) => {
					received = options
					return '  Use the stable release  '
				},
			},
		} as unknown as PluginToolContext

		const result = await testables.askUserQuestion(
			ampWithUnavailableError(),
			{ question: '  Which release should I use?  ' },
			ctx,
		)

		expect(received).toEqual({
			title: 'Agent question',
			helpText: 'Which release should I use?',
			submitButtonText: 'Answer',
		})
		expect(result).toBe('The user answered: Use the stable release')
	})

	test('shows options with a free-text fallback for a choice question', async () => {
		let received: Record<string, unknown> | undefined
		const ctx = {
			ui: {
				select: async (options: Record<string, unknown>) => {
					received = options
					return 'Only invited customers'
				},
			},
		} as unknown as PluginToolContext

		const result = await testables.askUserQuestion(
			ampWithUnavailableError(),
			{
				responseType: 'choice',
				question: 'Who can install the app?',
				options: ['Anyone', 'Managed organizations'],
			},
			ctx,
		)

		expect(received).toEqual({
			title: 'Agent question',
			message: 'Who can install the app?',
			options: ['Anyone', 'Managed organizations'],
			allowOther: true,
		})
		expect(result).toBe('The user answered: Only invited customers')
	})

	test('shows a confirmation for a yes-no question', async () => {
		let received: Record<string, unknown> | undefined
		const ctx = {
			ui: {
				confirm: async (options: Record<string, unknown>) => {
					received = options
					return false
				},
			},
		} as unknown as PluginToolContext

		const result = await testables.askUserQuestion(
			ampWithUnavailableError(),
			{ responseType: 'yes-no', question: 'Should old clients remain supported?' },
			ctx,
		)

		expect(received).toEqual({
			title: 'Agent question',
			message: 'Should old clients remain supported?',
			confirmButtonText: 'Yes',
		})
		expect(result).toBe('The user answered: No')
	})

	test('rejects a choice question without enough options', async () => {
		let calls = 0
		const ctx = {
			ui: {
				select: async () => {
					calls++
				},
			},
		} as unknown as PluginToolContext

		const result = await testables.askUserQuestion(
			ampWithUnavailableError(),
			{ responseType: 'choice', question: 'Who can install?', options: ['Anyone'] },
			ctx,
		)

		expect(result).toContain('must include 2–5')
		expect(calls).toBe(0)
	})

	test('falls back to a direct chat question when UI is unavailable', async () => {
		const unavailable = new Error('No active UI')
		const ctx = {
			ui: { input: async () => Promise.reject(unavailable) },
		} as unknown as PluginToolContext

		const result = await testables.askUserQuestion(
			ampWithUnavailableError(unavailable),
			{ question: 'Which release should I use?' },
			ctx,
		)

		expect(result).toContain('Ask the user directly in chat')
		expect(result).toContain('Which release should I use?')
	})

	test('reports cancellation without inventing an answer', async () => {
		const ctx = {
			ui: { input: async () => undefined },
		} as unknown as PluginToolContext

		const result = await testables.askUserQuestion(
			ampWithUnavailableError(),
			{ question: 'Which release should I use?' },
			ctx,
		)

		expect(result).toBe('The user cancelled the question without answering.')
	})

	test('reports errors without inventing an answer', async () => {
		const ctx = {
			ui: { input: async () => Promise.reject(new Error('Client disconnected')) },
		} as unknown as PluginToolContext

		const result = await testables.askUserQuestion(
			ampWithUnavailableError(),
			{ question: 'Which release should I use?' },
			ctx,
		)

		expect(result).toContain('failed: Client disconnected')
		expect(result).toContain('No answer was received')
	})

	test('rejects whitespace-only and oversized questions before calling the UI', async () => {
		let calls = 0
		const ctx = {
			ui: {
				input: async () => {
					calls++
				},
			},
		} as unknown as PluginToolContext

		for (const question of ['   ', 'x'.repeat(501)]) {
			const result = await testables.askUserQuestion(
				ampWithUnavailableError(),
				{ question },
				ctx,
			)
			expect(result).toContain('must contain 1–500')
		}
		expect(calls).toBe(0)
	})
})
