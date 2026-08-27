import { describe, expect, test } from 'bun:test'

import {
	createCoordinatorKickoff,
	createReportMessage,
	createWorkItemPrompt,
	extractDeliveryEvents,
	findThreadRole,
	type CompletedToolCall,
	type TranscriptMessage,
} from './protocol'
import type { DeliveryEvent, WorkItemDefinition } from './workflow'

const textMessage = (text: string): TranscriptMessage => ({
	role: 'user',
	content: [{ type: 'text', text }],
})

const item: WorkItemDefinition = {
	id: 'api-reader',
	outcome: 'Deploy the backward-compatible API reader.',
	project: 'example/api',
	baseBranch: 'schema-expand',
	repository: 'example/api',
	basedOn: 'schema-expand',
	rolloutAfter: ['schema-expand'],
}

describe('thread role markers', () => {
	test('round-trips coordinator configuration', () => {
		const kickoff = createCoordinatorKickoff({
			planningThreadId: 'T-planning',
			outcome: 'Ship the API safely.',
			roadmap: 'https://linear.app/example/issue/ENG-123',
			limits: { maxStackDepth: 3, maxReviewablePullRequests: 3 },
		})

		expect(findThreadRole([textMessage(kickoff)])).toEqual({
			kind: 'coordinator',
			planningThreadId: 'T-planning',
			outcome: 'Ship the API safely.',
			roadmap: 'https://linear.app/example/issue/ENG-123',
			limits: { maxStackDepth: 3, maxReviewablePullRequests: 3 },
		})
		expect(kickoff).toContain('delivery:coordinating-deliveries')
	})

	test('round-trips a one-PR worker assignment', () => {
		const prompt = createWorkItemPrompt('T-coordinator', item)

		expect(findThreadRole([textMessage(prompt)])).toEqual({
			kind: 'worker',
			coordinatorThreadId: 'T-coordinator',
			item,
		})
		expect(prompt).toContain('exactly one pull request')
		expect(prompt).toContain('reload_plugins')
	})
})

describe('delivery event extraction', () => {
	test('combines successful coordinator tools with child reports', () => {
		const report: DeliveryEvent = {
			type: 'work-item-reported',
			workItemId: item.id,
			childThreadId: 'T-worker',
			status: 'pr-opened',
			pullRequest: {
				url: 'https://github.com/example/api/pull/12',
				headBranch: 'api-reader',
				baseBranch: 'schema-expand',
				headSha: 'reader-sha',
				baseHeadSha: 'schema-sha',
			},
		}
		const calls: CompletedToolCall[] = [
			{
				call: { name: 'delivery_add_work_item', input: item },
				result: { status: 'done' },
			},
			{
				call: {
					name: 'delivery_register_child',
					input: { workItemId: item.id, childThreadId: 'T-worker' },
				},
				result: { status: 'done' },
			},
			{
				call: {
					name: 'delivery_request_rebase',
					input: {
						workItemId: item.id,
						requestKey: 'rebase:api-reader:merged:schema-expand:merge-sha',
						targetBranch: 'main',
						predecessorSha: 'merge-sha',
					},
				},
				result: { status: 'done' },
			},
		]

		expect(
			extractDeliveryEvents(
				[textMessage(createReportMessage(report))],
				calls,
			),
		).toEqual([
			{ type: 'work-item-added', item },
			{
				type: 'child-registered',
				workItemId: item.id,
				childThreadId: 'T-worker',
			},
			{
				type: 'rebase-requested',
				workItemId: item.id,
				requestKey: 'rebase:api-reader:merged:schema-expand:merge-sha',
				targetBranch: 'main',
				predecessorSha: 'merge-sha',
			},
			report,
		])
	})

	test('ignores failed tool calls and malformed report messages', () => {
		const calls: CompletedToolCall[] = [
			{
				call: { name: 'delivery_add_work_item', input: item },
				result: { status: 'error' },
			},
		]

		expect(
			extractDeliveryEvents(
				[textMessage('AMP_DELIVERY_EVENT_V1 {not-json}')],
				calls,
			),
		).toEqual([])
	})

	test('ignores report events with malformed pull-request data', () => {
		const malformed = {
			type: 'work-item-reported',
			workItemId: item.id,
			childThreadId: 'T-worker',
			status: 'pr-opened',
			pullRequest: { url: 12 },
		}

		expect(
			extractDeliveryEvents(
				[textMessage(`AMP_DELIVERY_EVENT_V1 ${JSON.stringify(malformed)}`)],
				[],
			),
		).toEqual([])
	})
})
