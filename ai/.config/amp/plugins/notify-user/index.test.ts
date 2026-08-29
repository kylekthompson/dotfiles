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
