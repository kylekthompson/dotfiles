import type {
	PluginAPI,
	PluginThread,
	PluginToolContext,
	ThreadMessage,
} from '@ampcode/plugin'

export const description =
	'Maintains a thread-visible delivery ledger and reconciles owner-accepted material reports from assigned worker threads.'

const EVENT_PATTERN = /<!-- delivery-cockpit:event (\{[^\n]*\}) -->/g
const EVENT_VERSION = 1
const PAGE_SIZE = 20
const OWNER_EVENT_TOOLS = ['delivery_start', 'delivery_record'] as const
const WORKER_EVENT_TOOLS = ['delivery_report'] as const

const DELIVERY_STATES = [
	'pending',
	'active',
	'draft',
	'blocked',
	'review',
	'merge',
	'rollout',
	'complete',
	'stopped',
] as const

const MATERIAL_KINDS = [
	'worker_started',
	'draft_pr_opened',
	'review_changes_complete',
	'blocker_changed',
	'ready_for_review',
	'ready_for_merge',
	'approval_recorded',
	'merged',
	'rollout_changed',
	'decision_changed',
	'manual_action_changed',
	'completed',
	'stopped',
	'superseded',
] as const

const CHILD_REPORT_KINDS = [
	'draft_pr_opened',
	'review_changes_complete',
	'blocker_changed',
	'ready_for_review',
	'ready_for_merge',
	'stopped',
	'superseded',
] as const

type DeliveryState = (typeof DELIVERY_STATES)[number]
type MaterialKind = (typeof MATERIAL_KINDS)[number]
type ChildReportKind = (typeof CHILD_REPORT_KINDS)[number]

type DeliveryItem = {
	id: string
	title: string
	dependsOn: string[]
}

type DeliveryStarted = {
	version: 1
	eventId: string
	deliveryId: string
	kind: 'delivery_started'
	outcome: string
	items: DeliveryItem[]
	ownerThread: string
}

type MaterialEvent = {
	version: 1
	eventId: string
	deliveryId: string
	kind: MaterialKind
	itemId: string
	state: DeliveryState
	summary: string
	nextGate: string
	sourceThread: string
	ownerThread?: string
	workerThread?: string
	pullRequest?: string
}

type DeliveryEvent = DeliveryStarted | MaterialEvent

type ItemLedger = DeliveryItem & {
	state: DeliveryState
	nextGate: string
	workerThread?: string
	pullRequest?: string
	lastKind?: MaterialKind
	lastSummary?: string
}

type DeliveryLedger = {
	deliveryId: string
	outcome: string
	ownerThread: string
	items: ItemLedger[]
	eventCount: number
}

type StartInput = {
	deliveryId: string
	outcome: string
	items: Array<{ id: string; title: string; dependsOn?: string[] }>
}

type RecordInput = {
	eventId: string
	deliveryId: string
	itemId: string
	kind: MaterialKind
	state: DeliveryState
	summary: string
	nextGate: string
	workerThread?: string
	pullRequest?: string
}

type ReportInput = Omit<RecordInput, 'kind' | 'workerThread'> & {
	kind: ChildReportKind
	ownerThread: string
}

type StatusInput = { deliveryId: string }

function fail(message: string): never {
	throw new Error(`Delivery cockpit: ${message}`)
}

function requiredString(value: unknown, name: string, maximum = 500): string {
	if (typeof value !== 'string' || value.trim() !== value || value.length === 0) {
		fail(`${name} must be a non-empty string without outer whitespace.`)
	}
	if (value.length > maximum) fail(`${name} must be at most ${maximum} characters.`)
	return value
}

function identifier(value: unknown, name: string): string {
	const result = requiredString(value, name, 64)
	if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(result)) {
		fail(`${name} may contain only letters, numbers, dots, underscores, and hyphens.`)
	}
	return result
}

function eventIdentifier(value: unknown): string {
	const result = requiredString(value, 'eventId', 128)
	if (!/^[A-Za-z0-9][A-Za-z0-9._:/-]*$/.test(result)) {
		fail('eventId contains unsupported characters.')
	}
	return result
}

function threadIdentifier(value: unknown, name: string): string {
	const result = requiredString(value, name, 64)
	if (!/^T-[A-Za-z0-9-]+$/.test(result)) fail(`${name} must be an Amp thread ID.`)
	return result
}

function optionalString(value: unknown, name: string, maximum = 500): string | undefined {
	if (value === undefined) return
	return requiredString(value, name, maximum)
}

function enumValue<const T extends readonly string[]>(
	value: unknown,
	name: string,
	values: T,
): T[number] {
	if (typeof value !== 'string' || !values.includes(value as T[number])) {
		fail(`${name} must be one of: ${values.join(', ')}.`)
	}
	return value as T[number]
}

function normalizeItems(value: unknown): DeliveryItem[] {
	if (!Array.isArray(value) || value.length === 0 || value.length > 50) {
		fail('items must contain between 1 and 50 delivery items.')
	}

	const items = value.map((entry, index) => {
		if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
			fail(`items[${index}] must be an object.`)
		}
		const item = entry as Record<string, unknown>
		const dependencies = item.dependsOn ?? []
		if (!Array.isArray(dependencies)) fail(`items[${index}].dependsOn must be an array.`)

		return {
			id: identifier(item.id, `items[${index}].id`),
			title: requiredString(item.title, `items[${index}].title`, 160),
			dependsOn: dependencies.map((dependency, dependencyIndex) =>
				identifier(dependency, `items[${index}].dependsOn[${dependencyIndex}]`),
			),
		}
	})

	const ids = new Set(items.map((item) => item.id))
	if (ids.size !== items.length) fail('item IDs must be unique.')
	for (const item of items) {
		for (const dependency of item.dependsOn) {
			if (!ids.has(dependency)) fail(`item ${item.id} depends on unknown item ${dependency}.`)
		}
	}

	const visited = new Set<string>()
	const visiting = new Set<string>()
	const byId = new Map(items.map((item) => [item.id, item]))
	const visit = (itemId: string) => {
		if (visiting.has(itemId)) fail(`item dependencies contain a cycle at ${itemId}.`)
		if (visited.has(itemId)) return
		visiting.add(itemId)
		for (const dependency of byId.get(itemId)?.dependsOn ?? []) visit(dependency)
		visiting.delete(itemId)
		visited.add(itemId)
	}
	for (const item of items) visit(item.id)

	return items
}

function normalizeStartInput(input: Record<string, unknown>, ownerThread: string): DeliveryStarted {
	const deliveryId = identifier(input.deliveryId, 'deliveryId')
	return {
		version: EVENT_VERSION,
		eventId: `delivery-start:${deliveryId}`,
		deliveryId,
		kind: 'delivery_started',
		outcome: requiredString(input.outcome, 'outcome', 500),
		items: normalizeItems(input.items),
		ownerThread,
	}
}

function normalizeMaterialInput(
	input: Record<string, unknown>,
	sourceThread: string,
	allowedKinds: readonly string[],
): MaterialEvent {
	const workerThread = optionalString(input.workerThread, 'workerThread', 64)
	if (workerThread) threadIdentifier(workerThread, 'workerThread')
	const pullRequest = optionalString(input.pullRequest, 'pullRequest', 500)
	if (pullRequest && !/^https:\/\/\S+$/.test(pullRequest)) {
		fail('pullRequest must be an HTTPS URL.')
	}

	return {
		version: EVENT_VERSION,
		eventId: eventIdentifier(input.eventId),
		deliveryId: identifier(input.deliveryId, 'deliveryId'),
		kind: enumValue(input.kind, 'kind', allowedKinds),
		itemId: identifier(input.itemId, 'itemId'),
		state: enumValue(input.state, 'state', DELIVERY_STATES),
		summary: requiredString(input.summary, 'summary', 500),
		nextGate: requiredString(input.nextGate, 'nextGate', 300),
		sourceThread,
		...(workerThread ? { workerThread } : {}),
		...(pullRequest ? { pullRequest } : {}),
	} as MaterialEvent
}

function stableValue(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(stableValue).join(',')}]`
	if (value && typeof value === 'object') {
		const object = value as Record<string, unknown>
		return `{${Object.keys(object)
			.sort()
			.map((key) => `${JSON.stringify(key)}:${stableValue(object[key])}`)
			.join(',')}}`
	}
	return JSON.stringify(value) ?? 'undefined'
}

function sameEvent(left: DeliveryEvent, right: DeliveryEvent): boolean {
	return stableValue(left) === stableValue(right)
}

function encodeEvent(event: DeliveryEvent): string {
	return `<!-- delivery-cockpit:event ${JSON.stringify(event)} -->`
}

function isDeliveryEvent(value: unknown): value is DeliveryEvent {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return false
	const event = value as Record<string, unknown>
	if (
		event.version !== EVENT_VERSION ||
		typeof event.eventId !== 'string' ||
		typeof event.deliveryId !== 'string'
	) {
		return false
	}
	if (event.kind === 'delivery_started') {
		return (
			typeof event.outcome === 'string' &&
			typeof event.ownerThread === 'string' &&
			Array.isArray(event.items) &&
			event.items.every((item) => {
				if (!item || typeof item !== 'object' || Array.isArray(item)) return false
				const candidate = item as Record<string, unknown>
				return (
					typeof candidate.id === 'string' &&
					typeof candidate.title === 'string' &&
					Array.isArray(candidate.dependsOn) &&
					candidate.dependsOn.every(
						(dependency: unknown) => typeof dependency === 'string',
					)
				)
			})
		)
	}
	return (
		MATERIAL_KINDS.includes(event.kind as MaterialKind) &&
		typeof event.itemId === 'string' &&
		DELIVERY_STATES.includes(event.state as DeliveryState) &&
		typeof event.summary === 'string' &&
		typeof event.nextGate === 'string' &&
		typeof event.sourceThread === 'string' &&
		(event.ownerThread === undefined || typeof event.ownerThread === 'string') &&
		(event.workerThread === undefined || typeof event.workerThread === 'string') &&
		(event.pullRequest === undefined || typeof event.pullRequest === 'string')
	)
}

function decodeEvents(text: string): DeliveryEvent[] {
	const events: DeliveryEvent[] = []
	for (const match of text.matchAll(EVENT_PATTERN)) {
		try {
			const event: unknown = JSON.parse(match[1])
			if (isDeliveryEvent(event)) events.push(event)
		} catch {
			// Ignore malformed markers. Plugin tool results always contain valid JSON.
		}
	}
	return events
}

function eventsFromMessages(
	messages: ThreadMessage[],
	acceptedToolNames: readonly string[],
): DeliveryEvent[] {
	const events: DeliveryEvent[] = []
	const toolNames = new Map<string, string>()
	const accepted = new Set(acceptedToolNames)
	for (const message of messages) {
		const stored = message as unknown as Record<string, unknown>
		const blocks = Array.isArray(stored.content)
			? stored.content
			: Array.isArray(stored.blocks)
				? stored.blocks
				: []
		if (message.role === 'assistant') {
			for (const block of blocks) {
				const candidate = block as unknown as Record<string, unknown>
				if (
					candidate.type === 'tool_use' &&
					typeof candidate.id === 'string' &&
					typeof candidate.name === 'string'
				) {
					toolNames.set(candidate.id, candidate.name)
				}
			}
			continue
		}
		if (message.role !== 'user') continue
		for (const block of blocks) {
			const candidate = block as unknown as Record<string, unknown>
			if (candidate.type !== 'tool_result' || candidate.status !== 'done') continue

			// Neo results identify their tool directly. Legacy results link to a preceding tool use.
			const toolName =
				typeof candidate.toolName === 'string'
					? candidate.toolName
					: toolNames.get(typeof candidate.toolUseID === 'string' ? candidate.toolUseID : '')
			const output = 'result' in candidate ? candidate.result : candidate.output
			if (toolName && accepted.has(toolName) && typeof output === 'string') {
				events.push(...decodeEvents(output))
			}
		}
	}
	return events
}

async function readAllMessages(thread: PluginThread): Promise<ThreadMessage[]> {
	const messages: ThreadMessage[] = []
	for (let offset = 0; ; offset += PAGE_SIZE) {
		const page = await thread.messages({ full: true, from: 'start', offset, limit: PAGE_SIZE })
		messages.push(...page)
		if (page.length < PAGE_SIZE) return messages
	}
}

async function readEvents(
	thread: PluginThread,
	acceptedToolNames: readonly string[],
): Promise<DeliveryEvent[]> {
	return eventsFromMessages(await readAllMessages(thread), acceptedToolNames)
}

function mergeEvents(persisted: DeliveryEvent[], pending: DeliveryEvent[]): DeliveryEvent[] {
	const events = [...persisted]
	const byId = new Map(persisted.map((event) => [event.eventId, event]))
	for (const event of pending) {
		const previous = byId.get(event.eventId)
		if (previous) {
			if (!sameEvent(previous, event)) fail(`event ID ${event.eventId} has conflicting payloads.`)
			continue
		}
		byId.set(event.eventId, event)
		events.push(event)
	}
	return events
}

class EventJournal {
	private readonly pending = new Map<string, DeliveryEvent[]>()
	private readonly tails = new Map<string, Promise<void>>()

	async transact<T>(
		thread: PluginThread,
		acceptedToolNames: readonly string[],
		operation: (events: DeliveryEvent[], remember: (event: DeliveryEvent) => void) => T,
	): Promise<T> {
		const threadKey = thread.id
		const channelKey = `${threadKey}:${acceptedToolNames.join(',')}`
		const previous = this.tails.get(threadKey) ?? Promise.resolve()
		let release!: () => void
		const gate = new Promise<void>((resolve) => {
			release = resolve
		})
		const tail = previous.then(() => gate)
		this.tails.set(threadKey, tail)
		await previous

		try {
			let persisted: DeliveryEvent[]
			try {
				persisted = await readEvents(thread, acceptedToolNames)
			} catch (error) {
				const detail = error instanceof Error ? error.message : String(error)
				fail(`could not read the durable transcript for thread ${thread.id}: ${detail}`)
			}
			const cached = this.pending.get(channelKey) ?? []
			const events = mergeEvents(persisted, cached)
			const persistedIds = new Set(persisted.map((event) => event.eventId))
			const pending = cached.filter((event) => !persistedIds.has(event.eventId))
			if (pending.length === 0) this.pending.delete(channelKey)
			else this.pending.set(channelKey, pending)
			return operation(events, (event) => {
				pending.push(event)
				this.pending.set(channelKey, pending)
			})
		} finally {
			release()
			if (this.tails.get(threadKey) === tail) this.tails.delete(threadKey)
		}
	}
}

async function withEvents<T>(
	thread: PluginThread,
	acceptedToolNames: readonly string[],
	journal: EventJournal | undefined,
	operation: (events: DeliveryEvent[], remember: (event: DeliveryEvent) => void) => T,
): Promise<T> {
	if (journal) return journal.transact(thread, acceptedToolNames, operation)
	return operation(await readEvents(thread, acceptedToolNames), () => {})
}

function replay(events: DeliveryEvent[]): Map<string, DeliveryLedger> {
	const ledgers = new Map<string, DeliveryLedger>()
	const seen = new Map<string, DeliveryEvent>()

	for (const event of events) {
		const previous = seen.get(event.eventId)
		if (previous) {
			if (!sameEvent(previous, event)) fail(`event ID ${event.eventId} has conflicting payloads.`)
			continue
		}
		seen.set(event.eventId, event)

		if (event.kind === 'delivery_started') {
			if (ledgers.has(event.deliveryId)) fail(`delivery ${event.deliveryId} was started more than once.`)
			ledgers.set(event.deliveryId, {
				deliveryId: event.deliveryId,
				outcome: event.outcome,
				ownerThread: event.ownerThread,
				items: event.items.map((item) => ({
					...item,
					state: 'pending',
					nextGate: 'dispatch decision',
				})),
				eventCount: 1,
			})
			continue
		}

		const ledger = ledgers.get(event.deliveryId)
		if (!ledger) fail(`event ${event.eventId} precedes delivery ${event.deliveryId}.`)
		const item = ledger.items.find((candidate) => candidate.id === event.itemId)
		if (!item) fail(`event ${event.eventId} names unknown item ${event.itemId}.`)
		if (event.sourceThread !== ledger.ownerThread) {
			fail(
				`event ${event.eventId} has source thread ${event.sourceThread}; expected owner ${ledger.ownerThread}.`,
			)
		}
		if (event.kind === 'worker_started') {
			if (!event.workerThread) fail(`worker_started event ${event.eventId} must name a worker.`)
			if (item.workerThread && item.workerThread !== event.workerThread) {
				fail(
					`item ${event.itemId} is still assigned to ${item.workerThread}; record superseded for that worker before reassignment.`,
				)
			}
		} else if (event.kind === 'superseded' && !event.workerThread) {
			fail(`superseded event ${event.eventId} must name the assigned worker.`)
		} else if (
			event.workerThread &&
			CHILD_REPORT_KINDS.includes(event.kind as ChildReportKind) &&
			item.workerThread !== event.workerThread
		) {
			fail(
				`item ${event.itemId} is assigned to ${item.workerThread ?? 'no worker'}, not ${event.workerThread}.`,
			)
		}
		item.state = event.state
		item.nextGate = event.nextGate
		item.lastKind = event.kind
		item.lastSummary = event.summary
		if (event.kind === 'superseded') delete item.workerThread
		else if (event.workerThread) item.workerThread = event.workerThread
		if (event.pullRequest) item.pullRequest = event.pullRequest
		ledger.eventCount += 1
	}

	return ledgers
}

function assertNewEvent(events: DeliveryEvent[], event: DeliveryEvent): 'new' | 'duplicate' {
	const previous = events.find((candidate) => candidate.eventId === event.eventId)
	if (!previous) return 'new'
	if (!sameEvent(previous, event)) fail(`event ID ${event.eventId} already has a different payload.`)
	return 'duplicate'
}

function ledgerFor(events: DeliveryEvent[], deliveryId: string): DeliveryLedger {
	const ledger = replay(events).get(deliveryId)
	if (!ledger) fail(`delivery ${deliveryId} is not recorded in this thread.`)
	return ledger
}

function tableCell(value: string): string {
	return value.replaceAll('|', '\\|').replaceAll('\n', ' ')
}

function renderLedger(ledger: DeliveryLedger): string {
	const lines = [
		`Delivery \`${ledger.deliveryId}\`: ${ledger.outcome}`,
		'',
		'| item | worker | PR | depends on | state | next gate |',
		'| --- | --- | --- | --- | --- | --- |',
	]
	for (const item of ledger.items) {
		lines.push(
			`| ${tableCell(`${item.id} — ${item.title}`)} | ${item.workerThread ?? '—'} | ${
				item.pullRequest ?? '—'
			} | ${item.dependsOn.join(', ') || '—'} | ${item.state} | ${tableCell(item.nextGate)} |`,
		)
	}
	lines.push('', `${ledger.eventCount - 1} material event(s) recorded.`)
	return lines.join('\n')
}

async function startDelivery(
	input: StartInput,
	ctx: PluginToolContext,
	journal?: EventJournal,
): Promise<string> {
	const event = normalizeStartInput(input as unknown as Record<string, unknown>, ctx.thread.id)
	return withEvents(ctx.thread, OWNER_EVENT_TOOLS, journal, (events, remember) => {
		const duplicate = assertNewEvent(events, event) === 'duplicate'
		if (!duplicate && replay(events).has(event.deliveryId)) {
			fail(`delivery ${event.deliveryId} already exists with a different start event.`)
		}
		if (duplicate) return `Delivery \`${event.deliveryId}\` already has this start event. No change.`

		const ledger = ledgerFor([...events, event], event.deliveryId)
		remember(event)
		return `${encodeEvent(event)}\n\n${renderLedger(ledger)}`
	})
}

async function recordMaterial(
	input: RecordInput,
	ctx: PluginToolContext,
	journal?: EventJournal,
): Promise<string> {
	const event = normalizeMaterialInput(
		input as unknown as Record<string, unknown>,
		ctx.thread.id,
		MATERIAL_KINDS,
	)
	return withEvents(ctx.thread, OWNER_EVENT_TOOLS, journal, (events, remember) => {
		const ledger = ledgerFor(events, event.deliveryId)
		if (ledger.ownerThread !== ctx.thread.id) {
			fail(
				`thread ${ctx.thread.id} is not the owner of delivery ${event.deliveryId}; expected ${ledger.ownerThread}.`,
			)
		}
		if (assertNewEvent(events, event) === 'duplicate') {
			return `Material event \`${event.eventId}\` is already recorded. No change.`
		}
		const item = ledger.items.find((candidate) => candidate.id === event.itemId)
		if (!item) {
			fail(`item ${event.itemId} is not part of delivery ${event.deliveryId}.`)
		}
		ledgerFor([...events, event], event.deliveryId)
		remember(event)

		return `${encodeEvent(event)}\n\nRecorded \`${event.kind}\` for \`${event.itemId}\`.`
	})
}

function reportMessage(event: MaterialEvent): string {
	return [
		encodeEvent(event),
		'',
		`Delivery proposal \`${event.eventId}\`: verify its Amp message attribution, then promote the marker fields with \`delivery_record\` in the owning thread.`,
	].join('\n')
}

async function reportMaterial(
	input: ReportInput,
	ctx: PluginToolContext,
	journal?: EventJournal,
): Promise<string> {
	const ownerThreadId = threadIdentifier(input.ownerThread, 'ownerThread')
	const event: MaterialEvent = {
		...normalizeMaterialInput(
			{ ...(input as unknown as Record<string, unknown>), workerThread: ctx.thread.id },
			ctx.thread.id,
			CHILD_REPORT_KINDS,
		),
		ownerThread: ownerThreadId,
	}
	return withEvents(ctx.thread, WORKER_EVENT_TOOLS, journal, (events, remember) => {
		const previous = events.find((candidate) => candidate.eventId === event.eventId)
		if (previous && !previous.ownerThread) {
			fail('legacy proposal has no recorded destination. Verify its original send and owner acceptance before preparing a replacement with a new eventId.')
		}
		const duplicate = assertNewEvent(events, event) === 'duplicate'
		if (!duplicate) remember(event)

		return [
			`${duplicate ? 'Recovered' : 'Prepared'} material event \`${event.eventId}\`. Preparation is not proof of delivery.`,
			`Use Amp's core \`send_thread_message\` tool with thread \`${ownerThreadId}\` and the exact content between the delimiters only if not yet sent or confirmed missing. If the send outcome is unknown, ask the owner to check for this event before resending. Do not resend a confirmed delivery.`,
			'',
			'DELIVERY_COCKPIT_REPORT_BEGIN',
			reportMessage(event),
			'DELIVERY_COCKPIT_REPORT_END',
		].join('\n')
	})
}

async function deliveryStatus(
	input: StatusInput,
	ctx: PluginToolContext,
	journal?: EventJournal,
): Promise<string> {
	const deliveryId = identifier(input.deliveryId, 'deliveryId')
	return withEvents(ctx.thread, OWNER_EVENT_TOOLS, journal, (events) =>
		renderLedger(ledgerFor(events, deliveryId)),
	)
}

const materialProperties = {
	eventId: {
		type: 'string',
		description: 'Stable idempotency key for this material event. Reuse it for retries.',
	},
	deliveryId: { type: 'string', description: 'Delivery identifier from delivery_start.' },
	itemId: { type: 'string', description: 'Delivery item that changed.' },
	state: {
		type: 'string',
		enum: DELIVERY_STATES,
		description: 'Explicit resulting ledger state. The plugin does not infer this state.',
	},
	summary: { type: 'string', description: 'Concise material change and evidence.' },
	nextGate: { type: 'string', description: 'Next decision, check, or explicit approval gate.' },
	pullRequest: { type: 'string', description: 'HTTPS pull-request URL, when known.' },
}

export default async function (amp: PluginAPI) {
	const journal = new EventJournal()

	amp.registerTool({
		name: 'delivery_start',
		title: 'Start delivery ledger',
		transcriptGroup: { active: 'Starting delivery ledger', complete: 'Started delivery ledger' },
		description:
			'Start a deterministic, thread-visible delivery ledger with structured items and dependencies. Use once in the owning thread after a multi-item delivery plan is settled.',
		inputSchema: {
			type: 'object',
			properties: {
				deliveryId: { type: 'string', description: 'Stable short identifier for this delivery.' },
				outcome: { type: 'string', description: 'Settled delivery outcome.' },
				items: {
					type: 'array',
					minItems: 1,
					maxItems: 50,
					items: {
						type: 'object',
						properties: {
							id: { type: 'string', description: 'Stable item identifier.' },
							title: { type: 'string', description: 'Short cohesive item outcome.' },
							dependsOn: {
								type: 'array',
								items: { type: 'string' },
								description: 'Other item IDs that constrain this item.',
							},
						},
						required: ['id', 'title'],
						additionalProperties: false,
					},
				},
			},
			required: ['deliveryId', 'outcome', 'items'],
			additionalProperties: false,
		},
		execute: (input, ctx) => startDelivery(input as unknown as StartInput, ctx, journal),
	})

	amp.registerTool({
		name: 'delivery_record',
		title: 'Record delivery event',
		transcriptGroup: { active: 'Recording delivery event', complete: 'Recorded delivery event' },
		description:
			'Record one owner-accepted material event or decision in an existing delivery ledger. Use it to promote a verified worker proposal. This only records state; it never approves or performs a shared action.',
		inputSchema: {
			type: 'object',
			properties: {
				...materialProperties,
				kind: {
					type: 'string',
					enum: MATERIAL_KINDS,
					description: 'Material transition or explicit owning-thread decision.',
				},
				workerThread: {
						type: 'string',
						description:
							'Amp worker thread ID. For a promoted worker proposal, this must match the item assignment.',
					},
			},
			required: ['eventId', 'deliveryId', 'itemId', 'kind', 'state', 'summary', 'nextGate'],
			additionalProperties: false,
		},
		execute: (input, ctx) => recordMaterial(input as unknown as RecordInput, ctx, journal),
	})

	amp.registerTool({
		name: 'delivery_report',
		title: 'Prepare material delivery report',
		transcriptGroup: { active: 'Preparing delivery report', complete: 'Prepared delivery report' },
		description:
			'Prepare one idempotent material worker proposal for send_thread_message delivery to its owning thread. The owner must verify and promote it. Use only for a listed report transition, never for routine progress.',
		inputSchema: {
			type: 'object',
			properties: {
				...materialProperties,
				kind: {
					type: 'string',
					enum: CHILD_REPORT_KINDS,
					description: 'Material worker report transition.',
				},
				ownerThread: {
					type: 'string',
					description:
						'Owning thread ID to target with Amp core send_thread_message. The owner ledger must assign this worker to the item.',
				},
			},
			required: [
				'eventId',
				'deliveryId',
				'itemId',
				'kind',
				'state',
				'summary',
				'nextGate',
				'ownerThread',
			],
			additionalProperties: false,
		},
		execute: (input, ctx) => reportMaterial(input as unknown as ReportInput, ctx, journal),
	})

	amp.registerTool({
		name: 'delivery_status',
		title: 'Render delivery ledger',
		transcriptGroup: { active: 'Reading delivery ledger', complete: 'Read delivery ledger' },
		description:
			'Reconstruct and render a compact delivery ledger from owner-accepted tool results in the current thread. Use at a gate, after promoting a report, or when the user asks for status.',
		inputSchema: {
			type: 'object',
			properties: {
				deliveryId: { type: 'string', description: 'Delivery identifier to render.' },
			},
			required: ['deliveryId'],
			additionalProperties: false,
		},
		execute: (input, ctx) => deliveryStatus(input as unknown as StatusInput, ctx, journal),
	})

	await amp.registerSkill({ path: 'skills/managing-deliveries' })
	await amp.registerSkill({ path: 'skills/delivering-changes' })
}

export const testables = {
	createEventJournal: () => new EventJournal(),
	decodeEvents,
	deliveryStatus,
	encodeEvent,
	eventsFromMessages,
	normalizeItems,
	replay,
	recordMaterial,
	renderLedger,
	reportMaterial,
	startDelivery,
}
