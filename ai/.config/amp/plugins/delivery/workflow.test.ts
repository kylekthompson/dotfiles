import { describe, expect, test } from 'bun:test'

import {
	evaluateDelivery,
	reduceDeliveryEvents,
	type DeliveryEvent,
	type PullRequestObservation,
} from './workflow'

const add = (id: string, basedOn?: string): DeliveryEvent => ({
	type: 'work-item-added',
	item: {
		id,
		outcome: `Deliver ${id}`,
		project: 'example/project',
		basedOn,
		rolloutAfter: [],
	},
})

const report = (
	id: string,
	url: string,
	baseHeadSha?: string,
): DeliveryEvent => ({
	type: 'work-item-reported',
	workItemId: id,
	childThreadId: `T-${id}`,
	status: 'pr-opened',
	pullRequest: {
		url,
		headBranch: id,
		baseBranch: id === 'a' ? 'main' : String.fromCharCode(id.charCodeAt(0) - 1),
		headSha: `${id}-1`,
		baseHeadSha,
	},
})

const observation = (
	id: string,
	state: PullRequestObservation['state'] = 'OPEN',
	overrides: Partial<PullRequestObservation> = {},
): PullRequestObservation => ({
	url: `https://github.com/example/repo/pull/${id.charCodeAt(0)}`,
	state,
	isDraft: false,
	headBranch: id,
	baseBranch: id === 'a' ? 'main' : String.fromCharCode(id.charCodeAt(0) - 1),
	headSha: `${id}-1`,
	...overrides,
})

describe('reduceDeliveryEvents', () => {
	test('reconstructs work-item ownership and pull-request state', () => {
		const state = reduceDeliveryEvents([
			add('a'),
			{ type: 'child-registered', workItemId: 'a', childThreadId: 'T-a' },
			report('a', 'https://github.com/example/repo/pull/97'),
		])

		expect(state.violations).toEqual([])
		expect(state.workItems.get('a')).toMatchObject({
			childThreadId: 'T-a',
			status: 'pr-opened',
			pullRequest: { url: 'https://github.com/example/repo/pull/97' },
		})
	})

	test('rejects a second pull request for one work item', () => {
		const state = reduceDeliveryEvents([
			add('a'),
			report('a', 'https://github.com/example/repo/pull/1'),
			report('a', 'https://github.com/example/repo/pull/2'),
		])

		expect(state.violations).toContain(
			'Work item a reported more than one pull request.',
		)
	})
})

describe('evaluateDelivery', () => {
	test('enforces active stack depth and global review limits', () => {
		const state = reduceDeliveryEvents([
			add('a'),
			add('b', 'a'),
			add('c', 'b'),
			add('d', 'c'),
			report('a', 'https://github.com/example/repo/pull/97'),
			report('b', 'https://github.com/example/repo/pull/98', 'a-1'),
			report('c', 'https://github.com/example/repo/pull/99', 'b-1'),
			report('d', 'https://github.com/example/repo/pull/100', 'c-1'),
		])
		const observations = new Map([
			[state.workItems.get('a')!.pullRequest!.url, observation('a')],
			[state.workItems.get('b')!.pullRequest!.url, observation('b')],
			[state.workItems.get('c')!.pullRequest!.url, observation('c')],
			[state.workItems.get('d')!.pullRequest!.url, observation('d')],
		])

		const evaluation = evaluateDelivery(state, observations)

		expect(evaluation.activeStackDepth).toBe(4)
		expect(evaluation.reviewablePullRequests).toBe(4)
		expect(evaluation.violations).toEqual([
			'Active pull-request stack depth 4 exceeds limit 3.',
			'Reviewable pull-request count 4 exceeds limit 3.',
		])
	})

	test('cascades rebases one successor at a time', () => {
		const initialEvents: DeliveryEvent[] = [
			add('a'),
			add('b', 'a'),
			add('c', 'b'),
			report('a', 'https://github.com/example/repo/pull/97'),
			report('b', 'https://github.com/example/repo/pull/98', 'a-1'),
			report('c', 'https://github.com/example/repo/pull/99', 'b-1'),
		]
		const firstState = reduceDeliveryEvents(initialEvents)
		const firstObservations = new Map([
			[
				firstState.workItems.get('a')!.pullRequest!.url,
				observation('a', 'MERGED', { mergeSha: 'main-a-merge' }),
			],
			[firstState.workItems.get('b')!.pullRequest!.url, observation('b')],
			[firstState.workItems.get('c')!.pullRequest!.url, observation('c')],
		])

		const firstEvaluation = evaluateDelivery(firstState, firstObservations)

		expect(firstEvaluation.nextRebase).toMatchObject({
			workItemId: 'b',
			targetBranch: 'main',
			predecessorSha: 'main-a-merge',
		})

		const request = firstEvaluation.nextRebase!
		const pendingState = reduceDeliveryEvents([
			...initialEvents,
			{ type: 'rebase-requested', ...request },
		])
		const pendingEvaluation = evaluateDelivery(pendingState, firstObservations)

		expect(pendingEvaluation.pendingRebase).toMatchObject({ workItemId: 'b' })
		expect(pendingEvaluation.nextRebase).toBeUndefined()

		const completedState = reduceDeliveryEvents([
			...initialEvents,
			{ type: 'rebase-requested', ...request },
			{
				type: 'work-item-reported',
				workItemId: 'b',
				childThreadId: 'T-b',
				status: 'rebase-completed',
				requestKey: request.requestKey,
				pullRequest: {
					url: 'https://github.com/example/repo/pull/98',
					headBranch: 'b',
					baseBranch: 'main',
					headSha: 'b-2',
					baseHeadSha: 'main-a-merge',
				},
			},
		])
		const completedObservations = new Map(firstObservations)
		completedObservations.set(
			completedState.workItems.get('b')!.pullRequest!.url,
			observation('b', 'OPEN', {
				baseBranch: 'main',
				headSha: 'b-2',
			}),
		)

		const completedEvaluation = evaluateDelivery(
			completedState,
			completedObservations,
		)

		expect(completedEvaluation.pendingRebase).toBeUndefined()
		expect(completedEvaluation.nextRebase).toMatchObject({
			workItemId: 'c',
			targetBranch: 'b',
			predecessorSha: 'b-2',
		})
	})
})
