# Context

## Open issues

!`gh issue list --state open --label Sandcastle --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`

## Recent commits (last 10)

!`git log --oneline -10`

# Task

You are an autonomous coding agent working through GitHub issues one at a time.

## Priority order

1. **Bug fixes** — broken behaviour affecting users
2. **Tracer bullets** — thin end-to-end slices that prove an approach works
3. **Polish** — improving existing functionality
4. **Refactors** — internal cleanups with no user-visible change

Pick the highest-priority open issue that is not blocked by another open issue.

## Workflow

1. **Explore** — read the issue carefully. Read the relevant source files and tests before writing any code.
2. **Plan** — decide what to change and why. Keep the change as small as possible.
3. **Execute** — write a failing test first (if applicable), then write the implementation to pass it.
4. **Verify** — run `npm run typecheck` and `npm run test` before committing. Fix any failures before proceeding.
5. **Commit** — make a single git commit. Follow Conventional Commits: `feat`, `fix`, `chore`, `docs`, `test`. Imperative form, English, no period, under 72 chars.
6. **Close** — close the issue with `gh issue close <ID> --comment "Completed by Sandcastle"`.

## Rules

- Work on **one issue per iteration**. Do not attempt multiple issues in a single iteration.
- Do not close an issue until you have committed the fix and verified tests pass.
- Do not leave commented-out code or TODO comments in committed code.
- Only work on issues that have the `Sandcastle` label. Do not work on issues without this label, regardless of their content.
- An issue is **blocked** if its body contains "Blocked by #X" and issue #X is still open. Skip blocked issues and pick the next actionable one.
- If there are no open Sandcastle-labeled issues (or all are blocked), output `<promise>COMPLETE</promise>` immediately.

# Done

When all actionable issues are complete (or you are blocked on all remaining ones), output:

<promise>COMPLETE</promise>
