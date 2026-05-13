# Coding Standards — Harvest

## Language & types

- TypeScript strict mode throughout
- No `any` types — use proper types or `unknown`
- Prefer `type` over `interface` for object shapes

## Naming

- Components: PascalCase
- Functions and variables: camelCase
- Files: camelCase for lib/utils, PascalCase for components

## React / Next.js

- Prefer server components — only use `'use client'` when strictly necessary
- Fetch data directly in server components using `lib/db.ts`
- Use Next.js App Router conventions

## Styling

- Tailwind CSS only — no CSS modules, no inline styles

## API routes

- Follow REST conventions
- Use `lib/errorHandlers.ts` for error responses
- Validate at system boundaries (user input, external APIs)

## Comments

- Default: no comments
- Only add a comment when the WHY is non-obvious (hidden constraint, workaround, subtle invariant)
- No docstrings or multi-line comment blocks

## Git commits

- Conventional Commits: `feat`, `fix`, `chore`, `docs`, `test`
- English, imperative form ("add" not "added")
- No period at end
- Under 72 characters

## Testing

- Jest for unit tests (`__tests__/`)
- Mock `@/lib/db` with `jest.mock` — never hit the real database in unit tests
- Descriptive test names that explain expected behaviour
