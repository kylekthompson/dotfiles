import { describe, expect, test } from 'bun:test'
import type { PluginAPI, PluginThread, PluginToolContext, ThreadMessage } from '@ampcode/plugin'
import deliveryCockpit, { testables } from './index'

const startEvent = {
	version: 1 as const,
	eventId: 'delivery-start:billing',
	deliveryId: 'billing',
	kind: 'delivery_started' as const,
	outcome: 'Ship billing safely',
	items: [
		{ id: 'schema', title: 'Expand storage', dependsOn: [] },
		{ id: 'api', title: 'Add the API', dependsOn: ['schema'] },
	],
	ownerThread: 'T-owner',
}

function userText(text: string, id: string): ThreadMessage {
	return { role: 'user', id, content: [{ type: 'text', text }] }
}

function toolResult(text: string, id: string): ThreadMessage {
	return {
		role: 'user',
		id,
		content: [
			{
				type: 'tool_result',
				toolUseID: `tool-${id}`,
				status: 'done',
				output: text,
			},
		],
	}
}

describe('plugin registration', () => {
	test('bundles the delivery workflows with their tools', async () => {
		const tools: string[] = []
		const skills: string[] = []
		const amp = {
			registerTool: (definition: { name: string }) => {
				tools.push(definition.name)
				return {}
			},
			registerSkill: async (definition: { path: string }) => {
				skills.push(definition.path)
				return {}
			},
		} as unknown as PluginAPI

		await deliveryCockpit(amp)

		expect(tools).toEqual([
			'delivery_start',
			'delivery_record',
			'delivery_report',
			'delivery_status',
		])
		expect(skills).toEqual([
			'skills/managing-deliveries',
			'skills/delivering-changes',
			'skills/coordinating-complex-rollouts',
		])
	})
})

describe('delivery event ledger', () => {
	test('validates references and rejects dependency cycles', () => {
		expect(() =>
			testables.normalizeItems([
				{ id: 'api', title: 'API', dependsOn: ['missing'] },
			]),
		).toThrow('depends on unknown item missing')

		expect(() =>
			testables.normalizeItems([
				{ id: 'one', title: 'One', dependsOn: ['two'] },
				{ id: 'two', title: 'Two', dependsOn: ['one'] },
			]),
		).toThrow('dependencies contain a cycle')
	})

	test('replays explicit events into a compact deterministic ledger', () => {
		const material = {
			version: 1 as const,
			eventId: 'api-draft-1',
			deliveryId: 'billing',
			kind: 'draft_pr_opened' as const,
			itemId: 'api',
			state: 'draft' as const,
			summary: 'Draft PR opened and focused checks pass.',
			nextGate: 'Owner review',
			sourceThread: 'T-worker',
			workerThread: 'T-worker',
			pullRequest: 'https://github.com/acme/app/pull/42',
		}

		const ledger = testables.replay([startEvent, material]).get('billing')!
		const rendered = testables.renderLedger(ledger)

		expect(ledger.items[1]).toMatchObject({
			state: 'draft',
			workerThread: 'T-worker',
			pullRequest: material.pullRequest,
			nextGate: 'Owner review',
		})
		expect(rendered).toContain('| api — Add the API | T-worker |')
		expect(rendered).toContain('| schema | draft | Owner review |')
		expect(rendered).toContain('1 material event(s) recorded')
	})

	test('deduplicates an identical event and rejects a conflicting reuse of its ID', () => {
		const event = {
			version: 1 as const,
			eventId: 'api-ready-1',
			deliveryId: 'billing',
			kind: 'ready_for_review' as const,
			itemId: 'api',
			state: 'review' as const,
			summary: 'Ready',
			nextGate: 'Review',
			sourceThread: 'T-worker',
		}

		expect(testables.replay([startEvent, event, event]).get('billing')?.eventCount).toBe(2)
		expect(() =>
			testables.replay([startEvent, event, { ...event, summary: 'Different' }]),
		).toThrow('conflicting payloads')
	})

	test('recovers accepted events from tool results and appended user reports only', () => {
		const marker = testables.encodeEvent(startEvent)
		const messages: ThreadMessage[] = [
			toolResult(marker, 'one'),
			userText(marker, 'two'),
			{ role: 'assistant', id: 'three', content: [{ type: 'text', text: marker }] },
		]

		expect(testables.eventsFromMessages(messages)).toHaveLength(2)
	})
})

describe('material child reports', () => {
	test('appends once across concurrent retries and after an in-memory restart', async () => {
		const messages: ThreadMessage[] = [toolResult(testables.encodeEvent(startEvent), 'start')]
		let appendCount = 0
		const parent = {
			id: 'T-owner',
			messages: async ({ offset = 0, limit = 20 }: { offset?: number; limit?: number } = {}) =>
				messages.slice(offset, offset + limit),
			appendUserMessage: async (message: { content: string }) => {
				await Bun.sleep(5)
				appendCount += 1
				messages.push(userText(message.content, `report-${appendCount}`))
			},
		} as unknown as PluginThread
		const amp = {
			threads: { get: (id: string) => (id === 'T-owner' ? parent : undefined) },
		} as unknown as PluginAPI
		const ctx = {
			thread: {
				id: 'T-worker',
				parentThreadID: async () => 'T-owner',
			},
		} as unknown as PluginToolContext
		const input = {
			eventId: 'api-draft-1',
			deliveryId: 'billing',
			itemId: 'api',
			kind: 'draft_pr_opened' as const,
			state: 'draft' as const,
			summary: 'Draft PR is open.',
			nextGate: 'Owner review',
			pullRequest: 'https://github.com/acme/app/pull/42',
		}

		const liveLocks = new Map<string, Promise<void>>()
		const results = await Promise.all([
			testables.reportMaterial(amp, input, ctx, liveLocks),
			testables.reportMaterial(amp, input, ctx, liveLocks),
		])
		expect(appendCount).toBe(1)
		expect(results.filter((result) => result.includes('No change'))).toHaveLength(1)

		const restartedLocks = new Map<string, Promise<void>>()
		const afterRestart = await testables.reportMaterial(amp, input, ctx, restartedLocks)
		expect(afterRestart).toContain('No change')
		expect(appendCount).toBe(1)
	})

	test('rejects a report whose direct parent does not own the named delivery', async () => {
		const parent = {
			id: 'T-other',
			messages: async () => [toolResult(testables.encodeEvent(startEvent), 'start')],
		} as unknown as PluginThread
		const amp = { threads: { get: () => parent } } as unknown as PluginAPI
		const ctx = {
			thread: { id: 'T-worker', parentThreadID: async () => 'T-other' },
		} as unknown as PluginToolContext

		await expect(
			testables.reportMaterial(
				amp,
				{
					eventId: 'api-ready-1',
					deliveryId: 'billing',
					itemId: 'api',
					kind: 'ready_for_review',
					state: 'review',
					summary: 'Ready',
					nextGate: 'Review',
				},
				ctx,
				new Map(),
			),
		).rejects.toThrow('target thread does not own this delivery')
	})

	test('routes a redirected report only when the new owner assigns that worker', async () => {
		const assignment = {
			version: 1 as const,
			eventId: 'handoff-api-worker',
			deliveryId: 'billing',
			kind: 'worker_started' as const,
			itemId: 'api',
			state: 'active' as const,
			summary: 'Recovered worker assignment.',
			nextGate: 'Draft PR',
			sourceThread: 'T-new-owner',
			workerThread: 'T-worker',
		}
		const messages = [
			toolResult(testables.encodeEvent({ ...startEvent, ownerThread: 'T-new-owner' }), 'start'),
			toolResult(testables.encodeEvent(assignment), 'assignment'),
		]
		let appended = false
		const owner = {
			id: 'T-new-owner',
			messages: async () => messages,
			appendUserMessage: async () => {
				appended = true
			},
		} as unknown as PluginThread
		const amp = { threads: { get: () => owner } } as unknown as PluginAPI
		const ctx = {
			thread: { id: 'T-worker', parentThreadID: async () => 'T-old-owner' },
		} as unknown as PluginToolContext

		await testables.reportMaterial(
			amp,
			{
				eventId: 'api-ready-after-handoff',
				deliveryId: 'billing',
				itemId: 'api',
				kind: 'ready_for_review',
				state: 'review',
				summary: 'Ready in the new owner.',
				nextGate: 'Review',
				ownerThread: 'T-new-owner',
			},
			ctx,
			new Map(),
		)

		expect(appended).toBe(true)

		const imposter = {
			thread: { id: 'T-imposter', parentThreadID: async () => 'T-old-owner' },
		} as unknown as PluginToolContext
		await expect(
			testables.reportMaterial(
				amp,
				{
					eventId: 'api-imposter-report',
					deliveryId: 'billing',
					itemId: 'api',
					kind: 'ready_for_review',
					state: 'review',
					summary: 'Wrong worker.',
					nextGate: 'Review',
					ownerThread: 'T-new-owner',
				},
				imposter,
				new Map(),
			),
		).rejects.toThrow('assigns this item to a different worker')
	})
})
