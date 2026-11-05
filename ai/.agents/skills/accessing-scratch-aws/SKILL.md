---
name: accessing-scratch-aws
description: Authenticates personal Amp projects to SomeSoftwareCompany's Scratch AWS account using temporary administrator credentials. Use for AWS access to Scratch account 863518447294.
---

# Accessing Scratch AWS

Use short-lived credentials for SomeSoftwareCompany's Scratch account only.

| AWS profile | Account | Role | Audience | Region |
| --- | --- | --- | --- | --- |
| `amp-scratch-admin` | `863518447294` | `arn:aws:iam::863518447294:role/amp-scratch-admin` | `urn:amp:aws:scratch-admin:863518447294` | `us-east-1` |

The role grants `AdministratorAccess` with a one-hour maximum session. This
includes IAM, secrets, and deletion across all regions. Access does not authorize
an operation: stay within the user's request and ask before destructive or
shared-risk changes not already authorized. Minimize sensitive output even for
read-only requests. Do not use this role as a route into other accounts.

## Identity requirement

Run in an Amp orb attached to a personal project owned by Kyle Thompson. IAM
trusts the exact audience above and subject pattern
`user:user_01KJB6721W31APPAWJ25YDVC7K:project:*`. Mint tokens with
`--subject-scope project`, not `workspace`, `thread`, or `user`.

Workspace-owned projects and project-less orbs do not satisfy this trust. Anyone
with access to a trusted personal project can use its project identity; it is not
limited to the project owner's interactive session. On an identity mismatch,
report the blocker; do not change trust or fall back to another credential source.

## Configure on demand

Requires the Amp CLI in an orb, AWS CLI v2, Python 3, and Bash. Check these tools
first. If AWS CLI is missing, follow AWS's official installation instructions;
never substitute stored access keys.

Resolve `scripts/aws-credentials` relative to this loaded skill's base directory
and read it before use. Do not hardcode Amp's cache revision. Inspect
`~/.aws/config`, preserve unrelated settings, and configure only this profile with
the resolved absolute helper path:

```ini
[profile amp-scratch-admin]
region = us-east-1
credential_process = /bin/bash /absolute/path/to/accessing-scratch-aws/scripts/aws-credentials
```

Resolve conflicting profile configurations before overwriting them. Quote the
helper path if it contains spaces. Invoking through Bash works even when
materialized scripts lack executable file modes. Configure at runtime, never from
project setup or a shared-snapshot lifecycle phase. Only configuration is
persisted, not credentials.

The helper has no target argument: it mints a project-scoped Amp token and
exchanges it directly for this Scratch role, requesting a one-hour AWS session.
It emits credential-process JSON with expiration, allowing compatible SDKs to
refresh. Separate CLI invocations may perform separate exchanges. Never invoke
the helper with stdout displayed: that output contains secrets.

## Verify and use

Before operations, select the profile explicitly and remove inherited credential
overrides:

```bash
env -u AWS_ACCESS_KEY_ID -u AWS_SECRET_ACCESS_KEY -u AWS_SESSION_TOKEN \
  -u AWS_SECURITY_TOKEN -u AWS_ROLE_ARN -u AWS_WEB_IDENTITY_TOKEN_FILE \
  -u AWS_PROFILE -u AWS_DEFAULT_PROFILE \
  aws --profile amp-scratch-admin sts get-caller-identity
```

Require account `863518447294` and an ARN beginning with
`arn:aws:sts::863518447294:assumed-role/amp-scratch-admin/`. Stop on mismatch. Use
the same explicit profile and cleaned environment for subsequent commands. The
default region does not restrict permissions; pass `--region` as needed.

Never print tokens or credentials, enable tracing around authentication, commit
credentials, or save them in shared snapshots. The helper uses a private temporary
token file and removes it on exit; do not persist its output. Existing AWS
sessions remain usable until expiration even if project access is removed.

On authentication failure, report the error without broadening trust, switching
profiles, or adding permissions. Merged infrastructure does not prove it has
been deployed: verify the live identity rather than assuming role availability.
Follow the current repository's execution and infrastructure delivery rules;
administrator access is not permission to bypass reviewed deployment workflows.
