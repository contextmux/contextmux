# contextmux GitHub Action

Drive tasks to pull requests under gates, and feed reviews back to the agent.

```yaml
- uses: contextmux/contextmux/packages/action@v0
  with:
    command: run
    task: ABC-1234
    tracker: jira
    agent: copilot
    allow: 'src/**,test/**'
```

See [`examples/`](./examples) for complete workflows.

## Exit codes

`run` distinguishes outcomes from failures:

| Code | Meaning |
| --- | --- |
| 0 | Changes proposed, or already up to date |
| 1 | The run failed |
| 3 | Gates rejected the task — it needs more detail |
| 4 | Escalated to a human |

The action treats 3 and 4 as notices rather than job failures, because a task needing a human
is a normal outcome and should not turn a scheduled workflow red.

## Tokens

Prefer a GitHub App installation token over a personal access token. It is short-lived, scoped
to the repository, and does not expire silently months later — which a PAT does, and the only
symptom is that automation quietly stops.

The Copilot agent additionally needs the coding agent enabled on the repository. `ctxmux doctor`
checks this and says so if it is not.
