import type {
	DeliveryEvent,
	DeliveryLimits,
	PullRequestReport,
	WorkItemDefinition,
	WorkItemStatus,
} from './workflow'

export const COORDINATOR_MARKER = 'AMP_DELIVERY_COORDINATOR_V1'
export const WORK_ITEM_MARKER = 'AMP_DELIVERY_WORK_ITEM_V1'
export const EVENT_MARKER = 'AMP_DELIVERY_EVENT_V1'

export type ThreadRole =
	| {
			kind: 'coordinator'
			planningThreadId: string
			outcome: string
			roadmap?: string
			limits: DeliveryLimits
	  }
	| {
			kind: 'worker'
			coordinatorThreadId: string
			item: WorkItemDefinition
	  }

export interface TranscriptMessage {
	role: string
	content: Array<{
		type: string
		text?: string
	}>
}

export interface CompletedToolCall {
	call: {
		name: string
		input: Record<string, unknown>
	}
	result: {
		status: 'done' | 'error' | 'cancelled'
	}
}

type CoordinatorRole = Extract<ThreadRole, { kind: 'coordinator' }>
type WorkerRole = Extract<ThreadRole, { kind: 'worker' }>
type WorkItemReport = Extract<DeliveryEvent, { type: 'work-item-reported' }>

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
}

function parseWorkItem(value: unknown): WorkItemDefinition | undefined {
	if (
		!isRecord(value) ||
		typeof value.id !== 'string' ||
		typeof value.outcome !== 'string' ||
		typeof value.project !== 'string' ||
		typeof value.baseBranch !== 'string' ||
		(value.repository !== undefined && typeof value.repository !== 'string') ||
		(value.basedOn !== undefined && typeof value.basedOn !== 'string') ||
		(value.rolloutAfter !== undefined && !isStringArray(value.rolloutAfter))
	) {
		return undefined
	}

	return {
		id: value.id,
		outcome: value.outcome,
		project: value.project,
		baseBranch: value.baseBranch,
		...(value.repository ? { repository: value.repository } : {}),
		...(value.basedOn ? { basedOn: value.basedOn } : {}),
		rolloutAfter: value.rolloutAfter ?? [],
	}
}

function parseReport(value: unknown): WorkItemReport | undefined {
	if (
		!isRecord(value) ||
		value.type !== 'work-item-reported' ||
		typeof value.workItemId !== 'string' ||
		typeof value.childThreadId !== 'string' ||
		!['working', 'pr-opened', 'review-ready', 'rebase-completed', 'blocked'].includes(
			String(value.status),
		) ||
		(value.requestKey !== undefined && typeof value.requestKey !== 'string') ||
		(value.details !== undefined && typeof value.details !== 'string')
	) {
		return undefined
	}

	let pullRequest: PullRequestReport | undefined
	if (value.pullRequest !== undefined) {
		if (
			!isRecord(value.pullRequest) ||
			typeof value.pullRequest.url !== 'string' ||
			typeof value.pullRequest.headBranch !== 'string' ||
			typeof value.pullRequest.baseBranch !== 'string' ||
			typeof value.pullRequest.headSha !== 'string' ||
			(value.pullRequest.baseHeadSha !== undefined &&
				typeof value.pullRequest.baseHeadSha !== 'string')
		) {
			return undefined
		}

		pullRequest = {
			url: value.pullRequest.url,
			headBranch: value.pullRequest.headBranch,
			baseBranch: value.pullRequest.baseBranch,
			headSha: value.pullRequest.headSha,
			...(value.pullRequest.baseHeadSha
				? { baseHeadSha: value.pullRequest.baseHeadSha }
				: {}),
		}
	}

	return {
		type: 'work-item-reported',
		workItemId: value.workItemId,
		childThreadId: value.childThreadId,
		status: value.status as WorkItemStatus,
		...(pullRequest ? { pullRequest } : {}),
		...(value.requestKey ? { requestKey: value.requestKey } : {}),
		...(value.details ? { details: value.details } : {}),
	}
}

function markerPayload(text: string, marker: string): unknown {
	const prefix = `${marker} `
	const line = text.split('\n').find((candidate) => candidate.startsWith(prefix))
	if (!line) return undefined

	try {
		return JSON.parse(line.slice(prefix.length))
	} catch {
		return undefined
	}
}

function textBlocks(messages: TranscriptMessage[]) {
	return messages.flatMap((message) =>
		message.content.flatMap((block) =>
			block.type === 'text' && block.text ? [block.text] : [],
		),
	)
}

export function createCoordinatorKickoff(
	role: Omit<CoordinatorRole, 'kind'>,
) {
	const marker = `${COORDINATOR_MARKER} ${JSON.stringify({ kind: 'coordinator', ...role })}`
	return [
		marker,
		'',
		'You own this delivery from plan through verified rollout. Load delivery:coordinating-deliveries before you decompose or delegate work.',
		`Read planning thread ${role.planningThreadId}, then confirm the delivery graph for: ${role.outcome}`,
	].join('\n')
}

export function createWorkItemPrompt(
	coordinatorThreadId: string,
	item: WorkItemDefinition,
) {
	const role: WorkerRole = { kind: 'worker', coordinatorThreadId, item }
	return [
		`${WORK_ITEM_MARKER} ${JSON.stringify(role)}`,
		'',
		`Own exactly one pull request that delivers this outcome: ${item.outcome}`,
		`Work in ${item.project}. Start the pull request from ${item.baseBranch}.`,
		'Create the pull request as a draft. You own its branch and may force-push it when a coordinator rebase request requires that.',
		'Do not merge the pull request, deploy it, or delegate another pull-request-sized task.',
		'Use delivery_report for working, pull-request, review, rebase, and blocker updates. Pull-request reports must include its URL, head and base branches, head SHA, and the current remote base-head SHA when this is a stacked PR.',
	].join('\n')
}

export function findThreadRole(messages: TranscriptMessage[]): ThreadRole | undefined {
	for (const text of textBlocks(messages)) {
		const coordinator = markerPayload(text, COORDINATOR_MARKER)
		if (
			isRecord(coordinator) &&
			coordinator.kind === 'coordinator' &&
			typeof coordinator.planningThreadId === 'string' &&
			typeof coordinator.outcome === 'string' &&
			(coordinator.roadmap === undefined ||
				typeof coordinator.roadmap === 'string') &&
			isRecord(coordinator.limits) &&
			typeof coordinator.limits.maxStackDepth === 'number' &&
			typeof coordinator.limits.maxReviewablePullRequests === 'number'
		) {
			return coordinator as unknown as CoordinatorRole
		}

		const worker = markerPayload(text, WORK_ITEM_MARKER)
		if (
			isRecord(worker) &&
			worker.kind === 'worker' &&
			typeof worker.coordinatorThreadId === 'string'
		) {
			const item = parseWorkItem(worker.item)
			if (item) {
				return {
					kind: 'worker',
					coordinatorThreadId: worker.coordinatorThreadId,
					item,
				}
			}
		}
	}

	return undefined
}

export function createReportMessage(event: WorkItemReport) {
	return `${EVENT_MARKER} ${JSON.stringify(event)}`
}

export function extractDeliveryEvents(
	messages: TranscriptMessage[],
	completedToolCalls: CompletedToolCall[],
): DeliveryEvent[] {
	const events: DeliveryEvent[] = []

	for (const { call, result } of completedToolCalls) {
		if (result.status !== 'done') continue

		if (call.name === 'delivery_add_work_item') {
			const item = parseWorkItem(call.input)
			if (item) events.push({ type: 'work-item-added', item })
			continue
		}

		if (
			call.name === 'delivery_register_child' &&
			typeof call.input.workItemId === 'string' &&
			typeof call.input.childThreadId === 'string'
		) {
			events.push({
				type: 'child-registered',
				workItemId: call.input.workItemId,
				childThreadId: call.input.childThreadId,
			})
			continue
		}

		if (
			call.name === 'delivery_request_rebase' &&
			typeof call.input.workItemId === 'string' &&
			typeof call.input.requestKey === 'string' &&
			typeof call.input.targetBranch === 'string' &&
			typeof call.input.predecessorSha === 'string'
		) {
			events.push({
				type: 'rebase-requested',
				workItemId: call.input.workItemId,
				requestKey: call.input.requestKey,
				targetBranch: call.input.targetBranch,
				predecessorSha: call.input.predecessorSha,
			})
		}
	}

	for (const text of textBlocks(messages)) {
		const report = parseReport(markerPayload(text, EVENT_MARKER))
		if (report) events.push(report)
	}

	return events
}
