# TASK

Review the code changes on branch `{{BRANCH}}` and improve code clarity, consistency, and maintainability while preserving exact functionality.

# CONTEXT

## Branch diff

!`git diff {{SOURCE_BRANCH}}...{{BRANCH}}`

## Commits on this branch

!`git log {{SOURCE_BRANCH}}..{{BRANCH}} --oneline`

# REVIEW PROCESS

1. **Understand the change**: Read the diff and commits above to understand the intent.

2. **Analyze for improvements**: Look for opportunities to:
   - Reduce unnecessary complexity and nesting
   - Eliminate redundant code and abstractions
   - Improve readability through clear variable and function names
   - Remove unnecessary comments that describe obvious code

3. **Check correctness**:
   - Does the implementation match the intent? Are edge cases handled?
   - Are new/changed behaviours covered by tests?
   - Are there unsafe casts, `any` types, or unchecked assumptions?
   - Does the change introduce injection vulnerabilities, credential leaks, or other security issues?

4. **Apply project standards**: Follow the coding standards defined in @.sandcastle/CODING_STANDARDS.md

5. **Preserve functionality**: Never change what the code does — only how it does it.

# EXECUTION

If you find improvements to make:

1. Make the changes directly on this branch
2. Run `npm run typecheck` and `npm run test` to ensure nothing is broken
3. Commit with message `refactor: <description>`

If the code is already clean and well-structured, do nothing.

Once complete, output <promise>COMPLETE</promise>.
