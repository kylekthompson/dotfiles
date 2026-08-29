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

function toolUse(name: string, id: string): ThreadMessage {
	return {
		role: 'assistant',
		id: `call-${id}`,
		content: [{ type: 'tool_use', id: `tool-${id}`, name, input: {} }],
	}
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
			sourceThread: 'T-owner',
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
			sourceThread: 'T-owner',
		}

		expect(testables.replay([startEvent, event, event]).get('billing')?.eventCount).toBe(2)
		expect(() =>
			testables.replay([startEvent, event, { ...event, summary: 'Different' }]),
		).toThrow('conflicting payloads')
	})

	test('recovers only accepted tool-result events and ignores user-authored markers', () => {
		const marker = testables.encodeEvent(startEvent)
		const messages: ThreadMessage[] = [
			toolUse('delivery_start', 'one'),
			toolResult(marker, 'one'),
			toolUse('delivery_report', 'report'),
			toolResult(marker, 'report'),
			toolUse('shell_command', 'unrelated'),
			toolResult(marker, 'unrelated'),
			userText(marker, 'two'),
			{ role: 'assistant', id: 'three', content: [{ type: 'text', text: marker }] },
		]

		expect(testables.eventsFromMessages(messages, ['delivery_start', 'delivery_record'])).toHaveLength(1)
	})
})

describe('material child reports', () => {
	test('prepares once from the worker transcript across a retry and reload', async () => {
		const messages: ThreadMessage[] = []
		const ctx = {
			thread: {
				id: 'T-worker',
				messages: async ({ offset = 0, limit = 20 }: { offset?: number; limit?: number } = {}) =>
					messages.slice(offset, offset + limit),
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
			ownerThread: 'T-owner',
		}

		const prepared = await testables.reportMaterial(input, ctx)
		expect(prepared).toContain('send_thread_message')
		expect(prepared).toContain('thread `T-owner`')
		expect(prepared).toContain('DELIVERY_COCKPIT_REPORT_BEGIN')
		expect(prepared).toContain('DELIVERY_COCKPIT_REPORT_END')
		messages.push(
			toolUse('delivery_report', 'prepared-report'),
			toolResult(prepared, 'prepared-report'),
		)

		const afterRestart = await testables.reportMaterial(input, ctx)
		expect(afterRestart).toContain('No change')
		expect(afterRestart).toContain('do not send it again')
	})

	test('rejects conflicting reuse of a prepared worker event ID', async () => {
		const messages: ThreadMessage[] = []
		const ctx = {
			thread: { id: 'T-worker', messages: async () => messages },
		} as unknown as PluginToolContext
		const input = {
			eventId: 'api-ready-1',
			deliveryId: 'billing',
			itemId: 'api',
			kind: 'ready_for_review' as const,
			state: 'review' as const,
			summary: 'Ready',
			nextGate: 'Review',
			ownerThread: 'T-owner',
		}

		messages.push(
			toolUse('delivery_report', 'prepared-report'),
			toolResult(await testables.reportMaterial(input, ctx), 'prepared-report'),
		)
		await expect(
			testables.reportMaterial({ ...input, summary: 'Different summary' }, ctx),
		).rejects.toThrow('already has a different payload')
	})

	test('owner promotion requires the worker already assigned to the item', async () => {
		const assignment = {
			version: 1 as const,
			eventId: 'api-worker-started',
			deliveryId: 'billing',
			kind: 'worker_started' as const,
			itemId: 'api',
			state: 'active' as const,
			summary: 'Worker assigned.',
			nextGate: 'Draft PR',
			sourceThread: 'T-owner',
			workerThread: 'T-worker',
		}
		const messages = [
			toolUse('delivery_start', 'start'),
			toolResult(testables.encodeEvent(startEvent), 'start'),
			toolUse('delivery_record', 'assignment'),
			toolResult(testables.encodeEvent(assignment), 'assignment'),
		]
		const ctx = {
			thread: { id: 'T-owner', messages: async () => messages },
		} as unknown as PluginToolContext

		await expect(
			testables.recordMaterial(
				{
					eventId: 'api-ready-imposter',
					deliveryId: 'billing',
					itemId: 'api',
					kind: 'ready_for_review',
					state: 'review',
					summary: 'Ready.',
					nextGate: 'Owner review',
					workerThread: 'T-imposter',
				},
				ctx,
			),
		).rejects.toThrow('item api is assigned to a different worker')
	})

	test('an exact promoted retry stays idempotent after worker reassignment', async () => {
		const assignment = {
			version: 1 as const,
			eventId: 'api-worker-started',
			deliveryId: 'billing',
			kind: 'worker_started' as const,
			itemId: 'api',
			state: 'active' as const,
			summary: 'Worker assigned.',
			nextGate: 'Draft PR',
			sourceThread: 'T-owner',
			workerThread: 'T-worker',
		}
		const promoted = {
			version: 1 as const,
			eventId: 'api-ready-1',
			deliveryId: 'billing',
			kind: 'ready_for_review' as const,
			itemId: 'api',
			state: 'review' as const,
			summary: 'Ready.',
			nextGate: 'Owner review',
			sourceThread: 'T-owner',
			workerThread: 'T-worker',
		}
		const reassignment = {
			...assignment,
			eventId: 'api-worker-reassigned',
			summary: 'Replacement worker assigned.',
			workerThread: 'T-replacement',
		}
		const messages = [
			toolUse('delivery_start', 'start'),
			toolResult(testables.encodeEvent(startEvent), 'start'),
			toolUse('delivery_record', 'assignment'),
			toolResult(testables.encodeEvent(assignment), 'assignment'),
			toolUse('delivery_record', 'promotion'),
			toolResult(testables.encodeEvent(promoted), 'promotion'),
			toolUse('delivery_record', 'reassignment'),
			toolResult(testables.encodeEvent(reassignment), 'reassignment'),
		]
		const ctx = {
			thread: { id: 'T-owner', messages: async () => messages },
		} as unknown as PluginToolContext

		const result = await testables.recordMaterial(
			{
				eventId: promoted.eventId,
				deliveryId: promoted.deliveryId,
				itemId: promoted.itemId,
				kind: promoted.kind,
				state: promoted.state,
				summary: promoted.summary,
				nextGate: promoted.nextGate,
				workerThread: promoted.workerThread,
			},
			ctx,
		)

		expect(result).toContain('already recorded. No change')
	})

	test('owner replay ignores early proposals and applies explicit promotion once', () => {
		const assignment = {
			version: 1 as const,
			eventId: 'api-worker-started',
			deliveryId: 'billing',
			kind: 'worker_started' as const,
			itemId: 'api',
			state: 'active' as const,
			summary: 'Worker assigned.',
			nextGate: 'Draft PR',
			sourceThread: 'T-owner',
			workerThread: 'T-worker',
		}
		const report = {
			version: 1 as const,
			eventId: 'api-ready-1',
			deliveryId: 'billing',
			kind: 'ready_for_review' as const,
			itemId: 'api',
			state: 'review' as const,
			summary: 'Ready.',
			nextGate: 'Owner review',
			sourceThread: 'T-worker',
			workerThread: 'T-worker',
		}

		expect(() => testables.replay([startEvent, assignment, report])).toThrow(
			'must be promoted by the owning thread',
		)

		const promoted = { ...report, sourceThread: 'T-owner' }
		const events = testables.eventsFromMessages(
			[
				toolUse('delivery_start', 'start'),
				toolResult(testables.encodeEvent(startEvent), 'start'),
				userText(testables.encodeEvent(report), 'early-proposal'),
				toolUse('delivery_record', 'assignment'),
				toolResult(testables.encodeEvent(assignment), 'assignment'),
				toolUse('delivery_record', 'promotion'),
				toolResult(testables.encodeEvent(promoted), 'promotion'),
				userText(testables.encodeEvent(report), 'duplicate-proposal'),
			],
			['delivery_start', 'delivery_record'],
		)
		const ledger = testables.replay(events).get('billing')
		expect(ledger?.items.find((item) => item.id === 'api')?.state).toBe('review')
		expect(ledger?.eventCount).toBe(3)
	})
})
