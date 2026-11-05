import { expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const helper = join(import.meta.dir, 'skills/accessing-scratch-aws/scripts/aws-credentials')

test('exchanges a private project token for expiring Scratch credential-process JSON', () => {
	const root = mkdtempSync(join(tmpdir(), 'scratch credentials '))
	try {
		const tokens = join(root, 'tokens')
		mkdirSync(tokens)
		writeFileSync(join(root, 'amp'), `#!/usr/bin/env bash
set -euo pipefail
[[ "$*" == 'orb id-token --audience urn:amp:aws:scratch-admin:863518447294 --subject-scope project' ]]
[[ "\${FAIL_AUTH:-}" != amp ]] || { echo 'token mint denied' >&2; exit 1; }
printf 'test-oidc-token'
`, { mode: 0o755 })
		writeFileSync(join(root, 'aws'), `#!/usr/bin/env python3
import json, os, pathlib, stat, sys
args = sys.argv[1:]
assert args[:2] == ['sts', 'assume-role-with-web-identity']
token = args[args.index('--web-identity-token') + 1]
assert token.startswith('file://')
path = pathlib.Path(token[7:])
assert stat.S_IMODE(path.stat().st_mode) == 0o600
assert path.read_text() == 'test-oidc-token'
assert args == [
    'sts', 'assume-role-with-web-identity', '--no-sign-request',
    '--endpoint-url', 'https://sts.us-east-1.amazonaws.com',
    '--region', 'us-east-1',
    '--role-arn', 'arn:aws:iam::863518447294:role/amp-scratch-admin',
    '--role-session-name', 'amp-scratch-admin', '--duration-seconds', '3600',
    '--web-identity-token', token, '--output', 'json', '--no-cli-pager',
]
if os.environ.get('FAIL_AUTH') == 'sts':
    sys.exit('STS denied')
print(json.dumps({'Credentials': {
    'AccessKeyId': 'test-access-id', 'SecretAccessKey': 'test-secret',
    'SessionToken': 'test-session', 'Expiration': '2030-02-03T04:05:06Z',
}}))
`, { mode: 0o755 })

		const run = (failure = '', args: string[] = []) => Bun.spawnSync({
			cmd: ['/bin/bash', '-x', helper, ...args],
			env: { ...process.env, PATH: `${root}:${process.env.PATH}`, TMPDIR: tokens, FAIL_AUTH: failure },
		})
		const success = run()
		expect(success.exitCode).toBe(0)
		expect(JSON.parse(success.stdout.toString())).toEqual({
			Version: 1,
			AccessKeyId: 'test-access-id',
			SecretAccessKey: 'test-secret',
			SessionToken: 'test-session',
			Expiration: '2030-02-03T04:05:06Z',
		})
		expect(success.stderr.toString()).not.toContain('test-oidc-token')
		expect(success.stderr.toString()).not.toContain('test-secret')
		expect(readdirSync(tokens)).toEqual([])

		for (const [failure, message] of [['amp', 'token mint denied'], ['sts', 'STS denied']]) {
			const denied = run(failure)
			expect(denied.exitCode).not.toBe(0)
			expect(denied.stdout.toString()).toBe('')
			expect(denied.stderr.toString()).toContain(message)
			expect(denied.stderr.toString()).not.toContain('test-oidc-token')
			expect(readdirSync(tokens)).toEqual([])
		}

		const wrongTarget = run('', ['dev-admin'])
		expect(wrongTarget.exitCode).toBe(2)
		expect(wrongTarget.stdout.toString()).toBe('')
		expect(readdirSync(tokens)).toEqual([])
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})
