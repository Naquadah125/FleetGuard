#!/usr/bin/env node
// Screenshot a page at one or more widths and report runtime errors + horizontal overflow.
//
//   node scripts/shot.mjs <url> <outDir> [--widths=1440,768,375] [--full] [--reduced]
//
// Writes <outDir>/<slug>-<width>.png. For each width prints `errors: [...]` (pageerror +
// console.error) and `overflowX: <px>` (documentElement.scrollWidth − innerWidth, min 0).
// --full     full-page screenshot (scrolls through the page first so scroll-triggered content runs)
// --reduced  emulate prefers-reduced-motion: reduce
// Exit code 1 if any width logged an error.
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright-core'

const args = process.argv.slice(2)
const positional = args.filter((a) => !a.startsWith('--'))
const flag = (name) => args.includes(`--${name}`)
const option = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=')

const [url, outDir] = positional
if (!url || !outDir) {
  console.error('usage: node scripts/shot.mjs <url> <outDir> [--widths=1440,768,375] [--full] [--reduced]')
  process.exit(2)
}

const widths = (option('widths') || '1440,768,375')
  .split(',')
  .map((w) => Number.parseInt(w, 10))
  .filter((w) => w > 0)
const full = flag('full')
const reduced = flag('reduced')

function slugify(u) {
  const { pathname, search } = new URL(u)
  const raw = `${pathname.replace(/\.html$/, '')}${search}`
  const slug = raw
    .replace(/^\/+/, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'index'
}

await mkdir(outDir, { recursive: true })
const slug = slugify(url)
const browser = await chromium.launch({ channel: 'chrome' })
let hadErrors = false

try {
  for (const width of widths) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      ...(reduced ? { reducedMotion: 'reduce' } : {}),
    })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`))
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`)
    })

    await page.goto(url, { waitUntil: 'load', timeout: 30000 })
    await page.waitForTimeout(600)

    if (full) {
      for (let i = 1; i <= 10; i++) {
        await page.evaluate((f) => window.scrollTo(0, document.documentElement.scrollHeight * f), i / 10)
        await page.waitForTimeout(150)
      }
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.waitForTimeout(500)
    }

    const overflowX = await page.evaluate(() =>
      Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
    )
    const file = path.join(outDir, `${slug}-${width}.png`)
    await page.screenshot({ path: file, fullPage: full })

    console.log(`[${width}] ${file}`)
    console.log(`errors: ${JSON.stringify(errors)}`)
    console.log(`overflowX: ${overflowX}`)
    if (errors.length) hadErrors = true
    await context.close()
  }
} finally {
  await browser.close()
}

process.exit(hadErrors ? 1 : 0)
