# Working in this repo

- TypeScript is strict. No `any`; type JSON where it is loaded in `src/lib/`.
- Screens live in `src/features/<area>/`, shared UI in `src/components/`, domain logic in `src/lib/`. Shared types are in `src/types.ts`.
- Keep rules such as agreement status, availability and damage routing in `src/lib/` as plain functions, so screens stay thin and the rules are easy to cover.
- Tests sit next to the code as `*.test.ts` or `*.test.tsx`.
- Run `npm run lint && npm test && npm run build` before pushing.
- Data changes go in `data/*.json`. Keep inventory status in line with open agreement lines; the agreement data checks in `src/lib/agreements.test.ts` catch mismatches.
- Styles are plain CSS in `src/styles.css`, one section per area. Reuse the tokens at the top of the file.
- Keep PRs small and focused on one change.
- Include a screenshot of any changed screen in the PR description.
- No backend, secrets or env vars. The app runs from local JSON and the browser.
