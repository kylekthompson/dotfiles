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

interface RegisteredCommand {
	execute: (ctx: unknown) => Promise<unknown>
}

interface CompletedCall {
	name: string
	input: Record<string, unknown>
	status?: 'done' | 'error' | 'cancelled'
}

interface ExtractedToolCall {
	call: { tool: string; input: Record<string, unknown> }
	result: { status: 'done' | 'error' | 'cancelled' }
}

const item: WorkItemDefinition = {
	id: 'api-reader',
	outcome: 'Deliver the API reader.',
	project: 'example/api',
	baseBranch: 'main',
	rolloutAfter: [],
}

const textMessage = (text: string, id = 1) => ({
	role: 'user',
	id,
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

function completedAddMessage(id: number): unknown {
	return {
		role: 'user',
		id,
		content: [],
		completedCall: {
			call: { tool: 'delivery_add_work_item', input: item },
			result: { status: 'done' },
		} satisfies ExtractedToolCall,
	}
}

function paginatedThread(id: string, messages: unknown[]): FakeThread {
	return {
		...fakeThread(id, messages[0]),
		messages: async (options) => {
			const { offset = 0, limit = 10 } = options as {
				offset?: number
				limit?: number
			}
			const start = offset === 0 ? 0 : offset - 1
			return messages.slice(start, start + limit)
		},
	}
}

async function loadPlugin(
	threads: Map<string, FakeThread>,
	completedCalls: CompletedCall[] = [],
	commands = new Map<string, RegisteredCommand>(),
) {
	const tools = new Map<string, RegisteredTool>()
	const amp = {
		registerSkill: async () => ({}),
		registerCommand: (
			name: string,
			_options: unknown,
			execute: RegisteredCommand['execute'],
		) => {
			commands.set(name, { execute })
			return {}
		},
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
			toolCallsInMessages: (messages: unknown[]) => [
					...completedCalls.map((entry) => ({
						call: { tool: entry.name, input: entry.input },
						result: { status: entry.status ?? 'done' },
					})),
					...messages.flatMap((message) => {
						const completedCall = (message as { completedCall?: ExtractedToolCall })
							.completedCall
						return completedCall ? [completedCall] : []
					}),
				],
		},
	}

	await deliveryPlugin(amp as never)
	return tools
}

describe('delivery coordinator command', () => {
	test('creates the coordinator in an orb', async () => {
		const commands = new Map<string, RegisteredCommand>()
		await loadPlugin(new Map(), [], commands)
		const createThreadCalls: unknown[] = []
		const inputs = ['Ship the API reader.', '']
		const coordinator = {
			appendUserMessage: async () => {},
		}

		await commands.get('delivery-start')!.execute({
			thread: {
				id: 'T-planning',
				agent: async () => ({
					createThread: async (options: unknown) => {
						createThreadCalls.push(options)
						return coordinator
					},
				}),
			},
			ui: {
				input: async () => inputs.shift(),
				notify: async () => {},
			},
		})

		expect(createThreadCalls).toEqual([
			{
				executor: 'orb',
				parentThreadID: 'T-planning',
				show: true,
			},
		])
	})
})

describe('delivery ledger pagination', () => {
	test('counts one add call once when transcript pages overlap', async () => {
		const transcript = [
			coordinatorMessage,
			...Array.from({ length: 18 }, (_, index) =>
				textMessage(`Filler ${index + 1}`, index + 2),
			),
			completedAddMessage(20),
			textMessage('After the page boundary.', 21),
		]
		const coordinator = paginatedThread('T-coordinator', transcript)
		const tools = await loadPlugin(new Map([[coordinator.id, coordinator]]))

		const status = await tools
			.get('delivery_reconcile')!
			.execute({}, { thread: coordinator })

		expect(status).toContain(`- ${item.id}: planned`)
		expect(status).not.toContain(`Work item ${item.id} was added more than once.`)
	})

	test('reports separate add calls for the same work-item ID', async () => {
		const coordinator = paginatedThread('T-coordinator', [
			coordinatorMessage,
			completedAddMessage(2),
			completedAddMessage(3),
		])
		const tools = await loadPlugin(new Map([[coordinator.id, coordinator]]))

		const status = await tools
			.get('delivery_reconcile')!
			.execute({}, { thread: coordinator })

		expect(status).toContain(`Work item ${item.id} was added more than once.`)
	})
})

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

	test('lets the coordinator mark a stopped work item abandoned', async () => {
		const coordinator = fakeThread('T-coordinator', coordinatorMessage)
		const tools = await loadPlugin(new Map([[coordinator.id, coordinator]]), [
			{ name: 'delivery_add_work_item', input: item },
			{
				name: 'delivery_register_child',
				input: { workItemId: item.id, childThreadId: 'T-worker' },
			},
		])

		await expect(
			tools.get('delivery_abandon_work_item')!.execute(
				{ workItemId: item.id, reason: 'Superseded by the new API.' },
				{ thread: coordinator },
			),
		).resolves.toContain(`Marked ${item.id} abandoned`)
	})
})
