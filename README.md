# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS

## Routing

- **Router:** [TanStack Router](https://tanstack.com/router) (via TanStack Start). React Router is not used.
- **How routes are defined:** file-based. Each file in `src/routes/` is a page, and its filename is its URL:
  `index.tsx` → `/`, `buffer.tsx` → `/buffer`, `budgets.tsx` → `/budgets`, `bills.tsx` → `/bills`,
  `trends.tsx` → `/trends`, `settings.tsx` → `/settings`. Each file calls
  `createFileRoute("/path")` with a matching path. `src/routes/__root.tsx` wraps every page in the shared
  layout (sidebar / bottom tab bar). `src/routeTree.gen.ts` is generated automatically; don't edit it.
- **Refreshing a deep link (e.g. `/buffer`):** works on the default deployment. The app is rendered on the
  server per request, so every URL returns its own page.
  If you instead export it as a **plain static site** (only HTML/JS files, no server), a refresh on `/buffer`
  only works if the host rewrites unknown paths to `index.html` (an SPA fallback, e.g. Netlify `_redirects`
  `/* /index.html 200`, or Vercel/Cloudflare Pages rewrites). Without that rewrite, the host returns a 404.

## Data & calculations

- `src/lib/types.ts`: the data types (Settings, IncomeEntry, Category, Transaction, RecurringBill, Goal). Dates are ISO strings.
- `src/lib/mockData.ts`: all mock data, typed with those interfaces.
- `src/lib/format.ts`: `formatMoney(amount, currency)`. Every amount on screen goes through this one function.
- `src/lib/calc.ts`: typed placeholder calculations that return mock values. Replace the bodies with real logic.
