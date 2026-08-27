export const DEFAULT_MAX_STACK_DEPTH = 3
export const DEFAULT_MAX_REVIEWABLE_PULL_REQUESTS = 3

export interface WorkItemDefinition {
	id: string
	outcome: string
	project: string
	baseBranch: string
	repository?: string
	basedOn?: string
	rolloutAfter: string[]
}

export type WorkItemStatus =
	| 'working'
	| 'pr-opened'
	| 'review-ready'
	| 'rebase-completed'
	| 'blocked'
	| 'abandoned'

export interface PullRequestReport {
	url: string
	headBranch: string
	baseBranch: string
	headSha: string
	baseHeadSha?: string
}

export type DeliveryEvent =
	| { type: 'work-item-added'; item: WorkItemDefinition }
	| { type: 'child-registered'; workItemId: string; childThreadId: string }
	| { type: 'work-item-abandoned'; workItemId: string; details: string }
	| { type: 'thread-archive-changed'; childThreadId: string; archived: boolean }
	| {
			type: 'work-item-reported'
			workItemId: string
			childThreadId: string
			status: WorkItemStatus
			pullRequest?: PullRequestReport
			requestKey?: string
			details?: string
	  }
	| {
			type: 'rebase-requested'
			workItemId: string
			requestKey: string
			targetBranch: string
			predecessorSha: string
	  }

export interface WorkItemState extends WorkItemDefinition {
	childThreadId?: string
	status?: WorkItemStatus
	pullRequest?: PullRequestReport
	completedRebaseRequests: string[]
	details?: string
}

export interface RebaseRequest {
	workItemId: string
	requestKey: string
	targetBranch: string
	predecessorSha: string
}

export interface DeliveryState {
	workItems: Map<string, WorkItemState>
	rebaseRequests: RebaseRequest[]
	archivedChildThreadIds: Set<string>
	violations: string[]
}

export interface PullRequestObservation {
	url: string
	state: 'OPEN' | 'MERGED' | 'CLOSED'
	isDraft: boolean
	headBranch: string
	baseBranch: string
	headSha: string
	mergeSha?: string
}

export interface DeliveryLimits {
	maxStackDepth: number
	maxReviewablePullRequests: number
}

export interface RebaseAction {
	workItemId: string
	requestKey: string
	targetBranch: string
	predecessorSha: string
	reason: string
}

export interface ArchiveAction {
	workItemId: string
	childThreadId: string
	reason: string
}

export interface DeliveryEvaluation {
	activeStackDepth: number
	reviewablePullRequests: number
	threadsToArchive: ArchiveAction[]
	pendingRebase?: RebaseRequest
	nextRebase?: RebaseAction
	violations: string[]
}

function addViolation(violations: string[], message: string) {
	if (!violations.includes(message)) violations.push(message)
}

export function reduceDeliveryEvents(events: DeliveryEvent[]): DeliveryState {
	const state: DeliveryState = {
		workItems: new Map(),
		rebaseRequests: [],
		archivedChildThreadIds: new Set(),
		violations: [],
	}

	for (const event of events) {
		if (event.type === 'work-item-added') {
			if (state.workItems.has(event.item.id)) {
				addViolation(
					state.violations,
					`Work item ${event.item.id} was added more than once.`,
				)
				continue
			}

			state.workItems.set(event.item.id, {
				...event.item,
				rolloutAfter: [...event.item.rolloutAfter],
				completedRebaseRequests: [],
			})
			continue
		}

		if (event.type === 'thread-archive-changed') {
			if (event.archived) state.archivedChildThreadIds.add(event.childThreadId)
			else state.archivedChildThreadIds.delete(event.childThreadId)
			continue
		}

		const item = state.workItems.get(event.workItemId)
		if (!item) {
			addViolation(
				state.violations,
				`Unknown work item ${event.workItemId} received ${event.type}.`,
			)
			continue
		}

		if (event.type === 'child-registered') {
			if (
				item.childThreadId &&
				item.childThreadId !== event.childThreadId
			) {
				addViolation(
					state.violations,
					`Work item ${item.id} was assigned to more than one child thread.`,
				)
				continue
			}

			item.childThreadId = event.childThreadId
			continue
		}

		if (event.type === 'work-item-abandoned') {
			item.status = 'abandoned'
			item.details = event.details
			continue
		}

		if (event.type === 'work-item-reported') {
			if (item.status === 'abandoned') {
				addViolation(
					state.violations,
					`Abandoned work item ${item.id} received a report.`,
				)
				continue
			}
			if (!item.childThreadId) {
				addViolation(
					state.violations,
					`Work item ${item.id} received a report before child registration.`,
				)
				continue
			}
			if (item.childThreadId !== event.childThreadId) {
				addViolation(
					state.violations,
					`Work item ${item.id} received a report from a different child thread.`,
				)
				continue
			}

			item.status = event.status
			item.details = event.details

			if (event.pullRequest) {
				const otherOwner = [...state.workItems.values()].find(
					(other) =>
						other.id !== item.id &&
						other.pullRequest?.url === event.pullRequest?.url,
				)
				if (otherOwner) {
					addViolation(
						state.violations,
						`Pull request ${event.pullRequest.url} is assigned to more than one work item.`,
					)
				} else if (
					item.pullRequest &&
					item.pullRequest.url !== event.pullRequest.url
				) {
					addViolation(
						state.violations,
						`Work item ${item.id} reported more than one pull request.`,
					)
				} else {
					item.pullRequest = { ...event.pullRequest }
				}
			}

			if (
				event.status === 'rebase-completed' &&
				event.requestKey &&
				!item.completedRebaseRequests.includes(event.requestKey)
			) {
				item.completedRebaseRequests.push(event.requestKey)
			}
			continue
		}

		if (
			!state.rebaseRequests.some(
				(request) => request.requestKey === event.requestKey,
			)
		) {
			state.rebaseRequests.push({
				workItemId: event.workItemId,
				requestKey: event.requestKey,
				targetBranch: event.targetBranch,
				predecessorSha: event.predecessorSha,
			})
		}
	}

	return state
}

export function evaluateDelivery(
	state: DeliveryState,
	observations: Map<string, PullRequestObservation>,
	limits: DeliveryLimits = {
		maxStackDepth: DEFAULT_MAX_STACK_DEPTH,
		maxReviewablePullRequests: DEFAULT_MAX_REVIEWABLE_PULL_REQUESTS,
	},
): DeliveryEvaluation {
	const observationFor = (item: WorkItemState) =>
		item.pullRequest ? observations.get(item.pullRequest.url) : undefined

	const depthByWorkItem = new Map<string, number>()
	const activeDepth = (item: WorkItemState, path: Set<string>): number => {
		const cached = depthByWorkItem.get(item.id)
		if (cached !== undefined) return cached

		const observation = observationFor(item)
		if (observation?.state !== 'OPEN') return 0
		if (!item.basedOn || path.has(item.id)) return 1

		const predecessor = state.workItems.get(item.basedOn)
		if (!predecessor || observationFor(predecessor)?.state !== 'OPEN') return 1

		const nextPath = new Set(path)
		nextPath.add(item.id)
		const depth = 1 + activeDepth(predecessor, nextPath)
		depthByWorkItem.set(item.id, depth)
		return depth
	}

	const workItems = [...state.workItems.values()]
	const activeStackDepth = Math.max(
		0,
		...workItems.map((item) => activeDepth(item, new Set())),
	)
	const reviewablePullRequests = workItems.filter((item) => {
		const observation = observationFor(item)
		return observation?.state === 'OPEN' && !observation.isDraft
	}).length
	const violations = [...state.violations]
	for (const item of workItems) {
		if (
			!item.childThreadId ||
			!state.archivedChildThreadIds.has(item.childThreadId)
		) {
			continue
		}
		const observation = observationFor(item)
		const terminal = item.status === 'abandoned' || observation?.state === 'MERGED'
		const terminalStateKnown = !item.pullRequest || observation !== undefined
		if (!terminal && terminalStateKnown) {
			addViolation(
				violations,
				`Child thread ${item.childThreadId} was archived before work item ${item.id} became terminal.`,
			)
		}
	}

	if (activeStackDepth > limits.maxStackDepth) {
		addViolation(
			violations,
			`Active pull-request stack depth ${activeStackDepth} exceeds limit ${limits.maxStackDepth}.`,
		)
	}
	if (reviewablePullRequests > limits.maxReviewablePullRequests) {
		addViolation(
			violations,
			`Reviewable pull-request count ${reviewablePullRequests} exceeds limit ${limits.maxReviewablePullRequests}.`,
		)
	}

	const threadsToArchive = workItems.flatMap((item): ArchiveAction[] => {
		if (
			!item.childThreadId ||
			state.archivedChildThreadIds.has(item.childThreadId)
		) {
			return []
		}
		if (item.status === 'abandoned') {
			return [
				{
					workItemId: item.id,
					childThreadId: item.childThreadId,
					reason: `Work item ${item.id} was abandoned.`,
				},
			]
		}
		if (observationFor(item)?.state === 'MERGED') {
			return [
				{
					workItemId: item.id,
					childThreadId: item.childThreadId,
					reason: `Pull request for ${item.id} merged.`,
				},
			]
		}
		return []
	})

	const pendingRebase = state.rebaseRequests.find((request) => {
		const item = state.workItems.get(request.workItemId)
		return (
			item?.status !== 'abandoned' &&
			!item?.completedRebaseRequests.includes(request.requestKey)
		)
	})
	if (pendingRebase) {
		return {
			activeStackDepth,
			reviewablePullRequests,
			threadsToArchive,
			pendingRebase,
			violations,
		}
	}

	for (const item of workItems) {
		const observation = observationFor(item)
		if (
			item.status === 'abandoned' ||
			observation?.state !== 'OPEN' ||
			!item.basedOn
		) {
			continue
		}

		const predecessor = state.workItems.get(item.basedOn)
		if (!predecessor || predecessor.status === 'abandoned') continue
		const predecessorObservation = observationFor(predecessor)
		if (!predecessorObservation) continue

		let nextRebase: RebaseAction | undefined
		if (predecessorObservation.state === 'MERGED') {
			const predecessorSha =
				predecessorObservation.mergeSha ?? predecessorObservation.headSha
			const requestKey = `rebase:${item.id}:merged:${predecessor.id}:${predecessorSha}`
			nextRebase = {
				workItemId: item.id,
				requestKey,
				targetBranch: predecessorObservation.baseBranch,
				predecessorSha,
				reason: `Predecessor ${predecessor.id} merged.`,
			}
		} else if (
			predecessorObservation.state === 'OPEN' &&
			item.pullRequest?.baseHeadSha &&
			item.pullRequest.baseHeadSha !== predecessorObservation.headSha
		) {
			const requestKey = `rebase:${item.id}:updated:${predecessor.id}:${predecessorObservation.headSha}`
			nextRebase = {
				workItemId: item.id,
				requestKey,
				targetBranch: predecessorObservation.headBranch,
				predecessorSha: predecessorObservation.headSha,
				reason: `Predecessor ${predecessor.id} changed head SHA.`,
			}
		}

		if (
			nextRebase &&
			!item.completedRebaseRequests.includes(nextRebase.requestKey)
		) {
			return {
				activeStackDepth,
				reviewablePullRequests,
				threadsToArchive,
				nextRebase,
				violations,
			}
		}
	}

	return { activeStackDepth, reviewablePullRequests, threadsToArchive, violations }
}
