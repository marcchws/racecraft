import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

/** Every state opens from a URL, so each one is checked for its content and for axe at both widths. */
const STATES: { name: string; path: string; see: string | RegExp; act?: (page: Page) => Promise<void> }[] = [
  { name: 'today', path: '/', see: '6 × 800 m' },
  { name: 'today loading', path: '/?state=loading', see: 'Loading' },
  { name: 'today done', path: '/?state=done', see: 'How did it feel?' },
  { name: 'today rest', path: '/?state=rest', see: 'Rest day' },
  { name: 'today watch not syncing', path: '/?state=syncfail', see: "Your watch isn't syncing" },
  { name: 'today plan failed', path: '/?state=error', see: "Couldn't load your plan" },
  { name: 'today no plan', path: '/?state=new', see: 'No plan yet' },
  { name: 'plan week', path: '/plan', see: 'Week 7' },
  { name: 'plan past week', path: '/plan?week=6', see: 'Missed' },
  { name: 'plan calendar', path: '/plan?view=calendar', see: 'Calendar' },
  { name: 'progress', path: '/progress', see: 'Consistency' },
  { name: 'progress no runs', path: '/progress?state=new', see: 'No runs yet' },
  { name: 'onboarding', path: '/start', see: 'Your race' },
  { name: 'you', path: '/you', see: 'Demo' },
  { name: 'not found', path: '/nowhere', see: 'Off the track' },
  { name: 'error page', path: '/?state=crash', see: 'Something broke' },
]

for (const s of STATES) {
  test(`${s.name} renders and passes axe`, async ({ page }) => {
    await page.goto(s.path)
    await expect(page.getByText(s.see).first()).toBeAttached()
    await s.act?.(page)
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([])
  })
}

test('send to watch, then undo', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Send to watch' }).click()
  await expect(page.getByRole('button', { name: 'On your watch' })).toBeVisible()
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByRole('button', { name: 'Send to watch' })).toBeVisible()
})

test('send to watch fails when the watch is not syncing', async ({ page }) => {
  await page.goto('/?state=syncfail')
  await page.getByRole('button', { name: 'Send to watch' }).click()
  await expect(page.getByText("Couldn't reach your watch. Try again in a minute.").first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Send to watch' })).toBeVisible()
})

test('rate how a run felt, then undo', async ({ page }) => {
  await page.goto('/?state=done')
  await page.getByRole('button', { name: 'Hard', exact: true }).click()
  await expect(page.getByText('Saved: Hard.').first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Hard', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByRole('button', { name: 'Hard', exact: true })).toHaveAttribute('aria-pressed', 'false')
})

test('the workout shape reads a block with the arrow keys', async ({ page }) => {
  await page.goto('/')
  const shape = page.getByRole('group', { name: /Workout shape/ })
  await shape.focus()
  for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowRight')
  await expect(page.getByText('Rep 3 of 6').first()).toBeVisible()
  await expect(page.getByText('800 m at 5:05/km · 4:04').first()).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByText('Warm-up 2.0 km · 6 × 800 m with 400 m jogs · cool-down 1.4 km').first()).toBeVisible()
})

test('skip today, the reps move to next Thursday, then undo', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'More: skip or move 6 × 800 m' }).click()
  await page.getByRole('button', { name: 'Skip this run' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Skip this run' }).click()
  await expect(page.getByText("the reps replace next Thursday's easy run").first()).toBeVisible()
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByRole('button', { name: 'Send to watch' })).toBeVisible()
})

test('move the tempo next to the reps warns and still moves it', async ({ page }) => {
  await page.goto('/plan')
  await page.getByRole('button', { name: 'More: skip or move Tempo 5 km' }).click()
  await page.getByRole('button', { name: 'Move to…' }).click()
  await page.getByRole('radio', { name: /Wednesday/ }).click()
  await expect(page.getByText('Tempo the day after reps: keep it easy or pick Friday.')).toBeVisible()
  await page.getByRole('button', { name: 'Move to Wednesday' }).click()
  await expect(page.getByText('Tempo 5 km moved to Wed 4 Nov.').first()).toBeVisible()
})

test('build a plan from onboarding and land on week 1', async ({ page }) => {
  await page.goto('/start')
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByText('Pick a race, or add your own.')).toBeVisible()
  await page.getByRole('radio', { name: /Recife Bridges Half/ }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByText(/needs at least 8/)).toBeVisible()
  await page.getByRole('radio', { name: /Curitiba Botanic Half/ }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('radio', { name: 'Weekly km' }).click()
  await page.getByLabel('Km in a usual week').fill('25')
  await page.getByRole('button', { name: 'Continue' }).click()
  for (const d of ['Monday', 'Wednesday', 'Saturday']) await page.getByRole('button', { name: d, exact: true }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Use this watch' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Build my plan' }).click()
  await expect(page.getByText('Building your plan')).toBeVisible()
  await expect(page.getByText(/Your plan is ready: 16 weeks to the Curitiba Botanic Half/).first()).toBeVisible({ timeout: 10_000 })
})

test('the Demo menu switches the scenario', async ({ page }) => {
  await page.goto('/you')
  await page.getByRole('radio', { name: /No plan yet/ }).click()
  await page.getByRole('link', { name: 'Today' }).first().click()
  await expect(page.getByRole('heading', { name: 'No plan yet' })).toBeVisible()
})
