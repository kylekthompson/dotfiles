import { describe, expect, test } from 'bun:test'

import deliveryPlugin from './index'
import {
	createCoordinatorKickoff,
	createReportMessage,
	createWorkItemPrompt,
} from './protocol'
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

interface RegisteredHook {
	execute: (
		event: Record<string, unknown>,
		ctx: { thread: FakeThread },
	) => Promise<unknown>
}

interface CompletedCall {
	toolUseID: string
	name: string
	input: Record<string, unknown>
	status?: 'done' | 'error' | 'cancelled'
}

interface ExtractedToolCall {
	call: { toolUseID: string; tool: string; input: Record<string, unknown> }
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

function fakeThreadWithMessages(id: string, messages: unknown[]): FakeThread {
	return {
		...fakeThread(id, messages[0]),
		messages: async () => messages,
	}
}

function completedAddMessage(id: number): unknown {
	return {
		role: 'user',
		id,
		content: [],
		completedCall: {
			call: {
				toolUseID: `tool-use-${id}`,
				tool: 'delivery_add_work_item',
				input: item,
			},
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
	hooks = new Map<string, RegisteredHook>(),
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
		on: (
			event: string,
			execute: RegisteredHook['execute'],
		) => {
			hooks.set(event, { execute })
			return {}
		},
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
						call: {
							toolUseID: entry.toolUseID,
							tool: entry.name,
							input: entry.input,
						},
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
})

describe('delivery ledger tool calls', () => {
	test('counts one completed invocation once when the helper repeats it', async () => {
		const coordinator = fakeThread('T-coordinator', coordinatorMessage)
		const completedAdd: CompletedCall = {
			toolUseID: 'tool-use-add',
			name: 'delivery_add_work_item',
			input: item,
		}
		const tools = await loadPlugin(
			new Map([[coordinator.id, coordinator]]),
			[completedAdd, completedAdd],
		)

		const status = await tools
			.get('delivery_reconcile')!
			.execute({}, { thread: coordinator })

		expect(status).toContain(`- ${item.id}: planned`)
		expect(status).not.toContain(`Work item ${item.id} was added more than once.`)
	})

	test('reports separate add invocations for the same work-item ID', async () => {
		const coordinator = fakeThread('T-coordinator', coordinatorMessage)
		const tools = await loadPlugin(
			new Map([[coordinator.id, coordinator]]),
			[
				{
					toolUseID: 'tool-use-add-1',
					name: 'delivery_add_work_item',
					input: item,
				},
				{
					toolUseID: 'tool-use-add-2',
					name: 'delivery_add_work_item',
					input: item,
				},
			],
		)

		const status = await tools
			.get('delivery_reconcile')!
			.execute({}, { thread: coordinator })

		expect(status).toContain(`Work item ${item.id} was added more than once.`)
	})
})

describe('delivery work-item dispatch', () => {
	test('dispatches a root work item', async () => {
		const coordinator = fakeThread('T-coordinator', coordinatorMessage)
		const tools = await loadPlugin(new Map([[coordinator.id, coordinator]]))

		await expect(
			tools
				.get('delivery_add_work_item')!
				.execute(item, { thread: coordinator }),
		).resolves.toContain(createWorkItemPrompt(coordinator.id, item))
	})

	test('rejects a stacked work item until its predecessor reports a pull request', async () => {
		const coordinator = fakeThreadWithMessages('T-coordinator', [
			coordinatorMessage,
			textMessage(
				createReportMessage({
					type: 'work-item-reported',
					workItemId: item.id,
					childThreadId: 'T-api-reader',
					status: 'working',
				}),
				2,
			),
		])
		const successor: WorkItemDefinition = {
			...item,
			id: 'api-writer',
			outcome: 'Deliver the API writer.',
			baseBranch: 'amp/api-reader',
			basedOn: item.id,
		}
		const tools = await loadPlugin(
			new Map([[coordinator.id, coordinator]]),
			[
				{
					toolUseID: 'tool-use-add-predecessor',
					name: 'delivery_add_work_item',
					input: item,
				},
				{
					toolUseID: 'tool-use-register-predecessor',
					name: 'delivery_register_child',
					input: { workItemId: item.id, childThreadId: 'T-api-reader' },
				},
			],
		)

		await expect(
			tools
				.get('delivery_add_work_item')!
				.execute(successor, { thread: coordinator }),
		).rejects.toThrow(
			`Cannot dispatch ${successor.id} until predecessor ${item.id} reports its draft pull request, remote head branch, and head SHA.`,
		)
	})

	test('dispatches a stacked work item after a valid predecessor pull-request report', async () => {
		const predecessorReport = {
			type: 'work-item-reported' as const,
			workItemId: item.id,
			childThreadId: 'T-api-reader',
			status: 'pr-opened' as const,
			pullRequest: {
				url: 'https://github.com/example/api/pull/12',
				headBranch: 'amp/api-reader',
				baseBranch: 'main',
				headSha: 'reader-sha',
			},
		}
		const coordinator = fakeThreadWithMessages('T-coordinator', [
			coordinatorMessage,
			textMessage(createReportMessage(predecessorReport), 2),
		])
		const successor: WorkItemDefinition = {
			...item,
			id: 'api-writer',
			outcome: 'Deliver the API writer.',
			baseBranch: predecessorReport.pullRequest.headBranch,
			basedOn: item.id,
		}
		const hooks = new Map<string, RegisteredHook>()
		const tools = await loadPlugin(
			new Map([[coordinator.id, coordinator]]),
			[
				{
					toolUseID: 'tool-use-add-predecessor',
					name: 'delivery_add_work_item',
					input: item,
				},
				{
					toolUseID: 'tool-use-register-predecessor',
					name: 'delivery_register_child',
					input: { workItemId: item.id, childThreadId: 'T-api-reader' },
				},
			],
			new Map(),
			hooks,
		)

		await expect(
			tools
				.get('delivery_add_work_item')!
				.execute(successor, { thread: coordinator }),
		).resolves.toContain('"id":"api-writer"')
		await expect(
			hooks.get('tool.call')!.execute(
				{
					tool: 'create_thread',
					input: { prompt: createWorkItemPrompt(coordinator.id, successor) },
				},
				{ thread: coordinator },
			),
		).resolves.toEqual({ action: 'allow' })
	})

	test('dispatches independent work while another root has no pull request', async () => {
		const coordinator = fakeThread('T-coordinator', coordinatorMessage)
		const independent: WorkItemDefinition = {
			...item,
			id: 'admin-ui',
			outcome: 'Deliver the admin UI.',
		}
		const tools = await loadPlugin(
			new Map([[coordinator.id, coordinator]]),
			[
				{
					toolUseID: 'tool-use-add-api-reader',
					name: 'delivery_add_work_item',
					input: item,
				},
			],
		)

		await expect(
			tools
				.get('delivery_add_work_item')!
				.execute(independent, { thread: coordinator }),
		).resolves.toContain(createWorkItemPrompt(coordinator.id, independent))
	})

	test('rejects a stale stacked create-thread call before creating an orphan', async () => {
		const coordinator = fakeThread('T-coordinator', coordinatorMessage)
		const successor: WorkItemDefinition = {
			...item,
			id: 'api-writer',
			outcome: 'Deliver the API writer.',
			baseBranch: 'amp/api-reader',
			basedOn: item.id,
		}
		const hooks = new Map<string, RegisteredHook>()
		await loadPlugin(
			new Map([[coordinator.id, coordinator]]),
			[
				{
					toolUseID: 'tool-use-add-predecessor',
					name: 'delivery_add_work_item',
					input: item,
				},
				{
					toolUseID: 'tool-use-add-successor',
					name: 'delivery_add_work_item',
					input: successor,
				},
			],
			new Map(),
			hooks,
		)

		await expect(
			hooks.get('tool.call')!.execute(
				{
					tool: 'create_thread',
					input: { prompt: createWorkItemPrompt(coordinator.id, successor) },
				},
				{ thread: coordinator },
			),
		).resolves.toEqual({
			action: 'reject-and-continue',
			message: `Cannot dispatch ${successor.id} until predecessor ${item.id} reports its draft pull request, remote head branch, and head SHA.`,
		})
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
					toolUseID: 'tool-use-add',
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
			{ toolUseID: 'tool-use-add', name: 'delivery_add_work_item', input: item },
			{
				toolUseID: 'tool-use-register',
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
