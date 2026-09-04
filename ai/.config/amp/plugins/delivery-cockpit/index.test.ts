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

function runtimeToolCall(name: string, id: string): ThreadMessage {
	return {
		role: 'assistant',
		id: `call-${id}`,
		kind: 'tool_call',
		content: [{ type: 'tool_call', toolName: name, input: {} }],
	} as unknown as ThreadMessage
}

function runtimeToolResult(name: string, result: string, id: string): ThreadMessage {
	return {
		role: 'user',
		id,
		kind: 'tool_result',
		origin: 'tool_result',
		content: [{ type: 'tool_result', toolName: name, status: 'done', result }],
	} as unknown as ThreadMessage
}

function persistedToolResult(name: string, result: string, id: string): ThreadMessage {
	return {
		role: 'user',
		id,
		kind: 'tool_result',
		origin: 'tool_result',
		blocks: [
			{
				type: 'tool_result',
				toolUseId: `tool-${id}`,
				toolName: name,
				status: 'done',
				result,
			},
		],
	} as unknown as ThreadMessage
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
		])
	})

	test('makes concurrent accepted records visible before the transcript snapshot advances', async () => {
		const tools = new Map<
			string,
			(input: Record<string, unknown>, ctx: PluginToolContext) => Promise<string | void>
		>()
		const amp = {
			registerTool: (definition: {
				name: string
				execute: (
					input: Record<string, unknown>,
					ctx: PluginToolContext,
				) => Promise<string | void>
			}) => {
				tools.set(definition.name, definition.execute)
				return {}
			},
			registerSkill: async () => ({}),
		} as unknown as PluginAPI
		await deliveryCockpit(amp)

		const messages = [persistedToolResult('delivery_start', testables.encodeEvent(startEvent), 'start')]
		const ctx = {
			thread: {
				id: 'T-owner',
				messages: async ({ offset = 0, limit = 20 }: { offset?: number; limit?: number } = {}) =>
					messages.slice(offset, offset + limit),
			},
		} as unknown as PluginToolContext
		const record = tools.get('delivery_record')!
		const event = {
			deliveryId: 'billing',
			kind: 'worker_started',
			state: 'active',
			summary: 'Worker assigned.',
			nextGate: 'Draft PR',
		}

		await Promise.all([
			record(
				{ ...event, eventId: 'schema-started', itemId: 'schema', workerThread: 'T-schema' },
				ctx,
			),
			record({ ...event, eventId: 'api-started', itemId: 'api', workerThread: 'T-api' }, ctx),
		])
		const promoted = await record(
			{
				eventId: 'api-ready',
				deliveryId: 'billing',
				itemId: 'api',
				kind: 'ready_for_review',
				state: 'review',
				summary: 'Ready for review.',
				nextGate: 'Owner review',
				workerThread: 'T-api',
			},
			ctx,
		)

		const status = await tools.get('delivery_status')!({ deliveryId: 'billing' }, ctx)
		expect(promoted).toContain('Recorded `ready_for_review` for `api`.')
		expect(status).toContain('| schema — Expand storage | T-schema |')
		expect(status).toContain('| api — Add the API | T-api |')
		expect(status).toContain('| schema | review | Owner review |')
		expect(status).toContain('3 material event(s) recorded')
	})

	test('makes a new delivery immediately available to a record call', async () => {
		const tools = new Map<
			string,
			(input: Record<string, unknown>, ctx: PluginToolContext) => Promise<string | void>
		>()
		const amp = {
			registerTool: (definition: {
				name: string
				execute: (
					input: Record<string, unknown>,
					ctx: PluginToolContext,
				) => Promise<string | void>
			}) => {
				tools.set(definition.name, definition.execute)
				return {}
			},
			registerSkill: async () => ({}),
		} as unknown as PluginAPI
		await deliveryCockpit(amp)

		const ctx = {
			thread: { id: 'T-owner', messages: async () => [] },
		} as unknown as PluginToolContext
		await tools.get('delivery_start')!(
			{ deliveryId: 'billing', outcome: startEvent.outcome, items: startEvent.items },
			ctx,
		)
		const result = await tools.get('delivery_record')!(
			{
				eventId: 'api-started',
				deliveryId: 'billing',
				itemId: 'api',
				kind: 'worker_started',
				state: 'active',
				summary: 'Worker assigned.',
				nextGate: 'Draft PR',
				workerThread: 'T-api',
			},
			ctx,
		)

		expect(result).toContain('Recorded `worker_started` for `api`.')
	})

	test('reconstructs all accepted events in a fresh plugin instance', async () => {
		const register = async () => {
			const tools = new Map<
				string,
				(input: Record<string, unknown>, ctx: PluginToolContext) => Promise<string | void>
			>()
			await deliveryCockpit({
				registerTool: (definition: {
					name: string
					execute: (
						input: Record<string, unknown>,
						ctx: PluginToolContext,
					) => Promise<string | void>
				}) => {
					tools.set(definition.name, definition.execute)
					return {}
				},
				registerSkill: async () => ({}),
			} as unknown as PluginAPI)
			return tools
		}
		const messages: ThreadMessage[] = []
		const ctx = {
			thread: {
				id: 'T-owner',
				messages: async ({ offset = 0, limit = 20 }: { offset?: number; limit?: number } = {}) =>
					messages.slice(offset, offset + limit),
			},
		} as unknown as PluginToolContext
		const firstInstance = await register()
		const started = await firstInstance.get('delivery_start')!(
			{ deliveryId: 'billing', outcome: startEvent.outcome, items: startEvent.items },
			ctx,
		)
		messages.push(persistedToolResult('delivery_start', started as string, 'start'))
		const recorded = await firstInstance.get('delivery_record')!(
			{
				eventId: 'api-started',
				deliveryId: 'billing',
				itemId: 'api',
				kind: 'worker_started',
				state: 'active',
				summary: 'Worker assigned.',
				nextGate: 'Draft PR',
				workerThread: 'T-api',
			},
			ctx,
		)
		messages.push(persistedToolResult('delivery_record', recorded as string, 'record'))

		const reloadedInstance = await register()
		const status = await reloadedInstance.get('delivery_status')!({ deliveryId: 'billing' }, ctx)
		expect(status).toContain('| api — Add the API | T-api |')
		expect(status).toContain('1 material event(s) recorded')
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

		const ledger = testables.replay([startEvent, assignment, material]).get('billing')!
		const rendered = testables.renderLedger(ledger)

		expect(ledger.items[1]).toMatchObject({
			state: 'draft',
			workerThread: 'T-worker',
			pullRequest: material.pullRequest,
			nextGate: 'Owner review',
		})
		expect(rendered).toContain('| api — Add the API | T-worker |')
		expect(rendered).toContain('| schema | draft | Owner review |')
		expect(rendered).toContain('2 material event(s) recorded')
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

	test('records one event without repeating the full ledger', async () => {
		const messages = [
			toolUse('delivery_start', 'start'),
			toolResult(testables.encodeEvent(startEvent), 'start'),
		]
		const ctx = {
			thread: { id: 'T-owner', messages: async () => messages },
		} as unknown as PluginToolContext

		const result = await testables.recordMaterial(
			{
				eventId: 'api-worker-started',
				deliveryId: 'billing',
				itemId: 'api',
				kind: 'worker_started',
				state: 'active',
				summary: 'Worker assigned.',
				nextGate: 'Draft PR',
				workerThread: 'T-worker',
			},
			ctx,
		)

		expect(result).toContain('<!-- delivery-cockpit:event')
		expect(result).toContain('Recorded `worker_started` for `api`.')
		expect(result).not.toContain('| item | worker |')
		expect(result).not.toContain('Delivery `billing`')
	})

	test('reconstructs start and record results across runtime tool invocations', async () => {
		const messages: ThreadMessage[] = []
		const ctx = {
			thread: {
				id: 'T-owner',
				messages: async ({ offset = 0, limit = 20 }: { offset?: number; limit?: number } = {}) =>
					messages.slice(offset, offset + limit),
			},
		} as unknown as PluginToolContext

		const startInput = {
			deliveryId: 'billing',
			outcome: startEvent.outcome,
			items: startEvent.items,
		}
		const started = await testables.startDelivery(startInput, ctx)
		messages.push(
			runtimeToolCall('delivery_start', 'start'),
			runtimeToolResult('delivery_start', started, 'start'),
		)
		expect(await testables.startDelivery(startInput, ctx)).toContain('already has this start event')

		const recordInput = {
			eventId: 'api-worker-started',
			deliveryId: 'billing',
			itemId: 'api',
			kind: 'worker_started' as const,
			state: 'active' as const,
			summary: 'Worker assigned.',
			nextGate: 'Draft PR',
			workerThread: 'T-worker',
		}
		const recorded = await testables.recordMaterial(recordInput, ctx)
		messages.push(
			runtimeToolCall('delivery_record', 'record'),
			runtimeToolResult('delivery_record', recorded, 'record'),
		)
		expect(await testables.recordMaterial(recordInput, ctx)).toContain('already recorded')

		const status = await testables.deliveryStatus({ deliveryId: 'billing' }, ctx)
		expect(status).toContain('| api — Add the API | T-worker |')
		expect(status).toContain('| schema | active | Draft PR |')
		expect(status).toContain('1 material event(s) recorded')
	})

	test('replays persisted result blocks across later calls and retries', async () => {
		const messages: ThreadMessage[] = []
		const ctx = {
			thread: {
				id: 'T-owner',
				messages: async ({ offset = 0, limit = 20 }: { offset?: number; limit?: number } = {}) =>
					messages.slice(offset, offset + limit),
			},
		} as unknown as PluginToolContext
		const startInput = {
			deliveryId: 'billing',
			outcome: startEvent.outcome,
			items: startEvent.items,
		}
		messages.push(
			{
				role: 'user',
				id: 'authored-marker',
				blocks: [{ type: 'text', text: testables.encodeEvent(startEvent) }],
			} as unknown as ThreadMessage,
			persistedToolResult('delivery_report', testables.encodeEvent(startEvent), 'proposal'),
		)

		const started = await testables.startDelivery(startInput, ctx)
		messages.push(persistedToolResult('delivery_start', started, 'start'))
		expect(await testables.startDelivery(startInput, ctx)).toContain('already has this start event')

		const recordInput = {
			eventId: 'api-worker-started',
			deliveryId: 'billing',
			itemId: 'api',
			kind: 'worker_started' as const,
			state: 'active' as const,
			summary: 'Worker assigned.',
			nextGate: 'Draft PR',
			workerThread: 'T-worker',
		}
		const recorded = await testables.recordMaterial(recordInput, ctx)
		messages.push(persistedToolResult('delivery_record', recorded, 'record'))

		expect(await testables.recordMaterial(recordInput, ctx)).toContain('already recorded')
		expect(await testables.deliveryStatus({ deliveryId: 'billing' }, ctx)).toContain(
			'1 material event(s) recorded',
		)
	})

	test('identifies durable transcript read failures', async () => {
		const ctx = {
			thread: {
				id: 'T-owner',
				messages: async () => {
					throw new Error('storage unavailable')
				},
			},
		} as unknown as PluginToolContext

		await expect(
			testables.deliveryStatus(
				{ deliveryId: 'billing' },
				ctx,
				testables.createEventJournal(),
			),
		).rejects.toThrow(
			'could not read the durable transcript for thread T-owner: storage unavailable',
		)
	})
})

describe('material child reports', () => {
	test('recovers the same proposal after preparation without a confirmed send', async () => {
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
		expect(prepared).toContain('Delivery proposal `api-draft-1`')
		expect(prepared).not.toContain('Summary:')
		expect(prepared).not.toContain('Next gate:')
		expect(prepared).not.toContain('Worker:')
		messages.push(
			toolUse('delivery_report', 'prepared-report'),
			toolResult(prepared, 'prepared-report'),
		)

		const afterRestart = await testables.reportMaterial(input, ctx)
		expect(testables.decodeEvents(afterRestart)).toEqual(testables.decodeEvents(prepared))
		expect(afterRestart).toContain('DELIVERY_COCKPIT_REPORT_BEGIN')
		expect(afterRestart).toContain('thread `T-owner`')
		expect(afterRestart).toContain('Preparation is not proof of delivery')
		expect(afterRestart).toContain('If the send outcome is unknown')
		expect(afterRestart).toContain('confirmed missing')
		expect(testables.decodeEvents(afterRestart)[0]).toMatchObject({ ownerThread: 'T-owner' })
		messages.push(
			toolUse('delivery_report', 'recovered-report'),
			toolResult(afterRestart, 'recovered-report'),
		)
		expect(await testables.reportMaterial(input, ctx)).toBe(afterRestart)
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
		await expect(
			testables.reportMaterial({ ...input, ownerThread: 'T-other-owner' }, ctx),
		).rejects.toThrow('already has a different payload')
	})

	test('requires reconciliation before replacing a legacy proposal without a destination', async () => {
		const input = {
			eventId: 'legacy-api-ready',
			deliveryId: 'billing',
			itemId: 'api',
			kind: 'ready_for_review' as const,
			state: 'review' as const,
			summary: 'Ready',
			nextGate: 'Review',
		}
		const legacy = testables.encodeEvent({
			...input,
			version: 1,
			sourceThread: 'T-worker',
			workerThread: 'T-worker',
		})
		const messages = [runtimeToolResult('delivery_report', legacy, 'legacy-report')]
		const ctx = {
			thread: { id: 'T-worker', messages: async () => messages },
		} as unknown as PluginToolContext

		expect(testables.decodeEvents(legacy)).toHaveLength(1)
		await expect(
			testables.reportMaterial({ ...input, ownerThread: 'T-owner' }, ctx),
		).rejects.toThrow('Verify its original send and owner acceptance')
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
		).rejects.toThrow('item api is assigned to T-worker, not T-imposter')
	})

	test('requires explicit supersession before worker reassignment', async () => {
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
			persistedToolResult('delivery_start', testables.encodeEvent(startEvent), 'start'),
			persistedToolResult('delivery_record', testables.encodeEvent(assignment), 'assignment'),
		]
		const ctx = {
			thread: { id: 'T-owner', messages: async () => messages },
		} as unknown as PluginToolContext
		const replacement = {
			eventId: 'api-replacement-started',
			deliveryId: 'billing',
			itemId: 'api',
			kind: 'worker_started' as const,
			state: 'active' as const,
			summary: 'Replacement assigned.',
			nextGate: 'Draft PR',
			workerThread: 'T-replacement',
		}

		await expect(testables.recordMaterial(replacement, ctx)).rejects.toThrow(
			'item api is still assigned to T-worker; record superseded for that worker before reassignment',
		)

		const superseded = {
			version: 1 as const,
			eventId: 'api-worker-superseded',
			deliveryId: 'billing',
			kind: 'superseded' as const,
			itemId: 'api',
			state: 'stopped' as const,
			summary: 'Worker replaced.',
			nextGate: 'Assign replacement',
			sourceThread: 'T-owner',
			workerThread: 'T-worker',
		}
		messages.push(
			persistedToolResult('delivery_record', testables.encodeEvent(superseded), 'superseded'),
		)

		expect(await testables.recordMaterial(replacement, ctx)).toContain(
			'Recorded `worker_started` for `api`.',
		)
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
		const superseded = {
			...promoted,
			eventId: 'api-worker-superseded',
			kind: 'superseded' as const,
			state: 'stopped' as const,
			summary: 'Original worker superseded.',
			nextGate: 'Assign replacement',
		}
		const messages = [
			toolUse('delivery_start', 'start'),
			toolResult(testables.encodeEvent(startEvent), 'start'),
			toolUse('delivery_record', 'assignment'),
			toolResult(testables.encodeEvent(assignment), 'assignment'),
			toolUse('delivery_record', 'promotion'),
			toolResult(testables.encodeEvent(promoted), 'promotion'),
			toolUse('delivery_record', 'superseded'),
			toolResult(testables.encodeEvent(superseded), 'superseded'),
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
			'event api-ready-1 has source thread T-worker; expected owner T-owner',
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
