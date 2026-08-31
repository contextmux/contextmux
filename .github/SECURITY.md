# Security policy

## Reporting a vulnerability

**Please do not open a public issue.**

Use [private vulnerability reporting](https://github.com/contextmux/contextmux/security/advisories/new),
which is enabled on this repository. It gives us a private thread, and a way to credit you and
publish an advisory once there is a fix.

Include what you would want if you were fixing it: the version (`ctxmux --version`), what you ran,
what happened, and what you expected instead. A proof of concept helps enormously, even a rough one.

This is a young project maintained by one person. You should expect a first reply within a week.
If a week passes with silence, assume the mail went astray and open a public issue saying only that
you are waiting on a security response — no details.

## Supported versions

| Version | Supported |
| ------- | --------- |
| 0.2.x   | Yes       |
| < 0.2   | No        |

Fixes land on the latest minor. There are no long-term support branches, and given the version
number you should not depend on one.

## What counts as a vulnerability here

contextmux runs coding agents that write to your repository and open pull requests, so its
interesting boundaries are not the usual ones. These are in scope:

- **A gate that can be bypassed.** The gates are the reason a change is allowed to become a pull
  request. A way to make a change pass `path-scope` while touching files outside the allowed globs,
  or pass `test-integrity` while disabling tests, is a real finding even though nothing crashes.
- **Escaping the declared scope.** A run modifying paths outside its `--allow` globs, or writing
  outside the worktree it was given.
- **Credential exposure.** A tracker or forge token reaching a log, an artefact, a generated file,
  or an agent prompt that did not need it.
- **Prompt content becoming execution.** Ticket text, review comments and PR comments are untrusted
  input. If content in a ticket can cause contextmux itself to run a command, exfiltrate a secret,
  or widen its own permissions, that is in scope.
- **State tampering.** Anything that lets one run read or alter another run's records, including
  through the shared state branch.

These are **not** in scope:

- An agent writing bad, insecure, or wrong code. Reviewing that is what the pull request is for, and
  contextmux does not claim the output is correct — only that it passed the declared gates.
- Vulnerabilities in a coding agent, tracker or forge we integrate with. Report those upstream; tell
  us too if contextmux makes them materially worse.
- Anything requiring an attacker who can already run commands on your machine or push to your
  repository. If they can do that, contextmux is not what is protecting you.
- Advisories against development dependencies that never ship. We fix them to keep the alert list
  honest, but they are not user-facing.

## What contextmux can reach

Worth knowing before you audit it. It reads your repository, and writes generated agent config, its
own `.ctxmux/` directory, and code inside a scoped worktree. It talks to your forge and tracker with
the tokens you give it, and to whichever agent you configure. It does not phone home, and there is
no telemetry.
