<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules

- **No new dependencies without asking.** Never add, remove or upgrade a package
  in `package.json` on your own initiative. Propose it, explain why it is needed,
  and wait for an explicit yes first.
- **No visual changes beyond the task.** Do not alter layout, styling, colours,
  typography, spacing, copy or component structure unless the current task asks
  for it. Keep diffs scoped to what was requested.
- **Small commits.** One logical change per commit. Keep the branch in a working
  state at all times. Never rewrite published git history — no force pushing, and
  no rebasing, amending or squashing commits that are already pushed.
- **Run typecheck, build and tests after every task, and show the output.**
  Run `bun run typecheck`, `bun run build` and `bun run test` after each task.
  Paste the real output into the response — never claim a pass you did not see.
  If something fails, say so plainly and explain why.
- **End each task with a list of files changed.** List every file created, edited
  or deleted for that task.
- **Browser storage is client-side only.** `localStorage` / `sessionStorage` /
  `indexedDB` do not exist while the server renders. All pages are server-rendered
  by TanStack Start, so any storage access must run in the browser only — inside
  `useEffect`, an event handler, or guarded by a `typeof window !== "undefined"`
  check. Never read or write browser storage at module scope or during render.
- **All money math lives in pure functions in `src/lib/calc`, with Vitest tests.**
  Keep every calculation of amounts, balances, budgets, safe-to-spend, buffers and
  trends in pure functions in `src/lib/calc` — no React, no DOM, no storage, no
  side effects. Cover them with Vitest tests. Components and routes only format and
  display those results.
