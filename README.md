# Racecraft

Racecraft builds a training plan toward one race for amateur runners, from 5K to the half marathon. You pick a race and its date and say how you run today. Racecraft lays out the plan week by week, sends each workout to your watch, reads the run back when the watch syncs, and moves things around when you miss a session.

**Live demo:** [racecraft-app.pages.dev](https://racecraft-app.pages.dev)

> This is a sample product. The runner (Luísa Prado), the races and every number are invented. There is no back end: the data is mocked in the browser and starts over on every reload.

## What's in it

- **Today.** The day's workout first: its name, distance, target paces and its *shape*, a bar per block where width is time and height is effort. Send it to your watch; after the run, see the synced result and say how it felt.
- **Plan.** The countdown to race day, the planned and done km of every week, a week view and a calendar of all twelve weeks. Move a workout to a free day; Racecraft warns before two hard days in a row.
- **Progress.** Weekly distance, easy pace and the predicted race time, over this plan, four weeks or three months. Every chart answers hover, tap and the arrow keys.
- **Plan onboarding.** Race, level, run days, watch, summary, then the plan is built.
- **You.** The watch connection, the run days, and a **Demo** menu that switches between scenarios (slow network, no plan yet, watch not syncing, errors).

The demo clock is fixed at Tuesday 3 November 2026, 06:10 in São Paulo: Luísa is in week 7 of 12 toward the São Paulo Riverside Half on Sunday 13 December, goal 1:52:00.

### How the plan adjusts

A missed hard session moves into the next week and replaces the easy run on its weekday. If that day has no easy run, it takes the first easy run of that week with no hard day beside it. The long run is never replaced, and a missed easy run is not made up. Week 6's missed tempo is how this Thursday's easy run became a tempo.

### Where the paces come from

Every pace comes from the goal pace (1:52:00 over a half marathon is 5:18/km): reps 13 s faster (5:05), tempo 2 s slower (5:20), easy and long runs 72 s slower (6:30). A new plan starts from a recent race time, carried to the race distance with Riegel's formula, or from weekly km alone.

### Every state from a link

Add `?state=` to any address to open a state directly: `loading`, `done`, `rest`, `syncfail`, `error`, `new`, `slow`, or `crash` for the error page. Plan takes `?week=6` and `?view=calendar`; Progress takes `?range=4w` or `?range=3m`.

## Run it

Node 22 or later.

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the build on http://localhost:4173 |
| `npm test` | Unit tests: plan generator, adjustment rule, pace maths, chart scales |
| `npm run test:e2e` | Every state at 1440 and 390 px, with axe, against the build (`npx playwright install chromium` once) |
| `npm run check` | All of the above, as CI runs it |

## Stack

React 19, Vite, TypeScript (strict), React Router, TanStack Query (optimistic updates with rollback for send, skip, move and feel), Tailwind CSS v4 with the brand's tokens as CSS variables, Radix primitives (dialog, popover, select, toast), and Mock Service Worker 2 as the only data source, in production too. The charts and the workout shape are hand-written SVG components with their own scales, not a chart library. Barlow and Big Shoulders Display are self-hosted (SIL Open Font License).

Tests run on Vitest and Playwright with axe-core. It deploys as a static site to Cloudflare Pages: with no `404.html` at the root, Pages serves the app for every path and the app draws its own 404.

## Layout

```
src/
  domain/   plan generator, adjustment rule, paces, seeded demo data (pure, unit-tested)
  mocks/    MSW handlers and the in-memory demo state
  api/      fetch client, response types, TanStack Query hooks
  charts/   workout shape, weekly bars, line chart, scales
  screens/  Today, Plan, Progress, Workout, Onboarding, You
  ui/       icons, "Bend" illustrations, sheet, menu, select, toast
e2e/        Playwright tests
```

## License

The code is MIT. The fonts keep their own OFL licenses.
