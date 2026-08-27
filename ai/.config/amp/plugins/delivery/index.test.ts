import { describe, expect, test } from 'bun:test'

import deliveryPlugin from './index'
import { createCoordinatorKickoff, createWorkItemPrompt } from './protocol'
import type { WorkItemDefinition } from './workflow'

interface FakeThread {
	id: string
	messages: (options?: unknown) => Promise<unknown[]>
	appendUserMessage: (message: unknown, options?: unknown) => Promise<void>
	parentThreadID: () => Promise<string | null>
}

interface RegisteredTool {
	execute: (
		input: Record<string, unknown>,
		ctx: { thread: FakeThread },
	) => Promise<unknown>
}

interface CompletedCall {
	name: string
	input: Record<string, unknown>
	status?: 'done' | 'error' | 'cancelled'
}

const item: WorkItemDefinition = {
	id: 'api-reader',
	outcome: 'Deliver the API reader.',
	project: 'example/api',
	baseBranch: 'main',
	rolloutAfter: [],
}

const textMessage = (text: string) => ({
	role: 'user',
	id: 1,
	content: [{ type: 'text', text }],
})

const coordinatorMessage = textMessage(
	createCoordinatorKickoff({
		planningThreadId: 'T-planning',
		outcome: 'Ship the API reader.',
		limits: { maxStackDepth: 3, maxReviewablePullRequests: 3 },
	}),
)

function fakeThread(id: string, marker: unknown): FakeThread {
	return {
		id,
		messages: async () => [marker],
		appendUserMessage: async () => {},
		parentThreadID: async () => null,
	}
}

async function loadPlugin(
	threads: Map<string, FakeThread>,
	completedCalls: CompletedCall[] = [],
) {
	const tools = new Map<string, RegisteredTool>()
	const amp = {
		registerSkill: async () => ({}),
		registerCommand: () => ({}),
		registerTool: (tool: RegisteredTool & { name: string }) => {
			tools.set(tool.name, tool)
			return {}
		},
		on: () => ({}),
		threads: {
			get: (threadId: string) => {
				const thread = threads.get(threadId)
				if (!thread) throw new Error(`Unknown fake thread ${threadId}.`)
				return thread
			},
		},
		helpers: {
			toolCallsInMessages: () =>
				completedCalls.map((entry) => ({
					call: { tool: entry.name, input: entry.input },
					result: { status: entry.status ?? 'done' },
				})),
		},
	}

	await deliveryPlugin(amp as never)
	return tools
}

describe('delivery thread boundaries', () => {
	test('registers a child without reading its transcript', async () => {
		const coordinator = fakeThread('T-coordinator', coordinatorMessage)
		const appended: Array<{ message: unknown; options: unknown }> = []
		const child: FakeThread = {
			...fakeThread('T-worker', textMessage('unused')),
			messages: async () => {
				throw new Error('thread.messages is only available for connected threads')
			},
			appendUserMessage: async (message, options) => {
				appended.push({ message, options })
			},
		}
		const tools = await loadPlugin(
			new Map([
				[coordinator.id, coordinator],
				[child.id, child],
			]),
			[
				{
					name: 'delivery_add_work_item',
					input: item,
				},
			],
		)

		await expect(
			tools.get('delivery_register_child')!.execute(
				{ workItemId: item.id, childThreadId: child.id },
				{ thread: coordinator },
			),
		).resolves.toContain(`Registered ${child.id}`)
		expect(appended).toHaveLength(1)
		expect(appended[0]).toMatchObject({ options: { steer: true } })
		expect(appended[0]!.message).toMatchObject({
			content: expect.stringContaining('reload_plugins'),
		})
	})

	test('reports through the coordinator marker without reading the coordinator', async () => {
		const worker = fakeThread(
			'T-worker',
			textMessage(createWorkItemPrompt('T-coordinator', item)),
		)
		worker.parentThreadID = async () => {
			throw new Error('parentThreadID is unavailable')
		}
		const appended: unknown[] = []
		const coordinator: FakeThread = {
			...fakeThread('T-coordinator', coordinatorMessage),
			messages: async () => {
				throw new Error('thread.messages is only available for connected threads')
			},
			appendUserMessage: async (message) => {
				appended.push(message)
			},
		}
		const tools = await loadPlugin(
			new Map([
				[worker.id, worker],
				[coordinator.id, coordinator],
			]),
		)

		await expect(
			tools.get('delivery_report')!.execute(
				{ status: 'working', details: 'Inspecting the API.' },
				{ thread: worker },
			),
		).resolves.toContain(`to ${coordinator.id}`)
		expect(appended).toHaveLength(1)
		expect(appended[0]).toMatchObject({
			content: expect.stringContaining('AMP_DELIVERY_EVENT_V1'),
		})
	})
})
