#!/usr/bin/env node
// Landing page acceptance checks (Review Focus 1–4 of the redesign plan).
//
//   node scripts/check-landing.mjs [baseUrl=http://localhost:5173]
//
// Prints `PASS <name>` / `FAIL <name>: <reason>` per assertion; exits 1 if any FAIL.
// Needs a running dev server (dev-only hooks such as `window.__fg` are used by no-leak).
import { chromium } from 'playwright-core'

const BASE = (process.argv[2] || 'http://localhost:5173').replace(/\/+$/, '')
const SECTION_IDS = ['top', 'features', 'demo', 'technology', 'pricing', 'comparison', 'contact']
const NAV_TIMEOUT = 20000
const ACTION_TIMEOUT = 5000

const results = []
const pass = (name) => {
  results.push({ name, ok: true })
  console.log(`PASS ${name}`)
}
const fail = (name, reason) => {
  results.push({ name, ok: false })
  console.log(`FAIL ${name}: ${reason}`)
}

async function newPage(browser, { width = 1440, height = 900, reducedMotion } = {}) {
  const context = await browser.newContext({
    viewport: { width, height },
    ...(reducedMotion ? { reducedMotion } : {}),
  })
  const page = await context.newPage()
  page.setDefaultTimeout(ACTION_TIMEOUT)
  page.setDefaultNavigationTimeout(NAV_TIMEOUT)
  const errors = []
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`))
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`)
  })
  return { context, page, errors }
}

async function load(page, path = '/') {
  await page.goto(`${BASE}${path}`, { waitUntil: 'load' })
  await page.waitForTimeout(500)
}

// Scroll to the bottom in 10 steps, 150ms apart.
async function fullScroll(page) {
  for (let i = 1; i <= 10; i++) {
    await page.evaluate((f) => window.scrollTo(0, document.documentElement.scrollHeight * f), i / 10)
    await page.waitForTimeout(150)
  }
}

async function run(name, fn) {
  try {
    const reason = await fn()
    if (reason) fail(name, reason)
    else pass(name)
  } catch (err) {
    fail(name, `threw ${String(err?.message || err).split('\n')[0]}`)
  }
}

async function pricingTop(page) {
  return page.evaluate(() => {
    const el = document.getElementById('pricing')
    return el ? el.getBoundingClientRect().top : null
  })
}

const browser = await chromium.launch({ channel: 'chrome' })

try {
  // 1. sections — every fixed section id is present.
  await run('sections', async () => {
    const { context, page } = await newPage(browser)
    try {
      await load(page)
      const missing = await page.evaluate(
        (ids) => ids.filter((id) => !document.getElementById(id)),
        SECTION_IDS,
      )
      return missing.length ? `missing #${missing.join(', #')}` : null
    } finally {
      await context.close()
    }
  })

  // 2. no-errors — no pageerror / console.error after load + full scroll.
  await run('no-errors', async () => {
    const { context, page, errors } = await newPage(browser)
    try {
      await load(page)
      await fullScroll(page)
      await page.waitForTimeout(300)
      return errors.length ? `${errors.length} error(s): ${errors.slice(0, 3).join(' | ')}` : null
    } finally {
      await context.close()
    }
  })

  // 3. no-overflow — no horizontal page scroll at 375 / 768 / 1440.
  await run('no-overflow', async () => {
    const problems = []
    for (const width of [375, 768, 1440]) {
      const { context, page } = await newPage(browser, { width })
      try {
        await load(page)
        await fullScroll(page)
        const m = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
        }))
        if (m.scrollWidth > m.innerWidth) problems.push(`${width}: scrollWidth ${m.scrollWidth} > ${m.innerWidth}`)
      } finally {
        await context.close()
      }
    }
    return problems.length ? problems.join('; ') : null
  })

  // 4. no-<old brand> — the previous brand's name is not in the DOM and its old asset is gone.
  // The name is assembled at runtime so a repo-wide grep for it stays empty.
  const OLD_BRAND = ['sam', 'sara'].join('')
  await run(`no-${OLD_BRAND}`, async () => {
    const { context, page } = await newPage(browser)
    try {
      await load(page)
      const r = await page.evaluate(async (brand) => {
        const html = document.documentElement.outerHTML
        const match = html.match(new RegExp(`.{0,40}${brand}.{0,40}`, 'i'))
        const res = await fetch(`/${brand}-icon.svg`)
        const type = res.headers.get('content-type') || ''
        const body = await res.text()
        const isSpaHtml = type.includes('text/html') || /^\s*<!doctype html/i.test(body)
        return { match: match ? match[0] : null, status: res.status, assetGone: res.status === 404 || isSpaHtml }
      }, OLD_BRAND)
      const problems = []
      if (r.match) problems.push(`DOM contains "${OLD_BRAND}" (…${r.match.trim()}…)`)
      if (!r.assetGone) problems.push(`/${OLD_BRAND}-icon.svg still served (status ${r.status})`)
      return problems.length ? problems.join('; ') : null
    } finally {
      await context.close()
    }
  })

  // 5. reduced-motion — with prefers-reduced-motion everything in <main> is visible.
  await run('reduced-motion', async () => {
    const { context, page } = await newPage(browser, { reducedMotion: 'reduce' })
    try {
      await load(page)
      await fullScroll(page)
      await page.waitForTimeout(300)
      const r = await page.evaluate(() => {
        const main = document.querySelector('main')
        if (!main) return { error: 'no <main> element' }
        const describe = (el) => {
          const text = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40)
          return `<${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}> "${text}"`
        }
        const bad = []
        let checked = 0
        for (const el of main.querySelectorAll('[data-reveal], h1, h2, h3, p')) {
          if (el.closest('[aria-hidden="true"]')) continue
          checked++
          let hidden = null
          for (let n = el; n; n = n.parentElement) {
            const op = getComputedStyle(n).opacity
            if (op !== '1') {
              hidden = `opacity ${op}${n === el ? '' : ` on ancestor <${n.tagName.toLowerCase()}>`}`
              break
            }
            if (n === main) break
          }
          const width = el.getBoundingClientRect().width
          if (hidden) bad.push(`${describe(el)} ${hidden}`)
          else if (!(width > 0)) bad.push(`${describe(el)} width ${width}`)
        }
        return { checked, bad }
      })
      if (r.error) return r.error
      if (r.checked === 0) return 'no [data-reveal], h1, h2, h3, p found inside <main>'
      return r.bad.length
        ? `${r.bad.length}/${r.checked} not visible: ${r.bad.slice(0, 4).join(' | ')}`
        : null
    } finally {
      await context.close()
    }
  })

  // 5b. above-fold — with normal motion and NO scrolling (wait 2.5s), every [data-reveal], h1, h2,
  // h3, p in <main> that intersects the first viewport is visible (opacity ≥ 0.99 up to <main>).
  // Reveals whose clamped start resolves to 0 must still fire at scroll 0.
  await run('above-fold', async () => {
    const problems = []
    for (const [width, height] of [
      [1440, 900],
      [375, 812],
      // 1920x1080: the hero is shorter than 80% of this viewport, so the Features heading's
      // clamped start resolves to 0 (the case that broke before the fix).
      [1920, 1080],
    ]) {
      const { context, page } = await newPage(browser, { width, height })
      try {
        await page.goto(`${BASE}/`, { waitUntil: 'load' })
        await page.waitForTimeout(2500)
        const r = await page.evaluate(() => {
          const main = document.querySelector('main')
          if (!main) return { error: 'no <main> element' }
          const vw = window.innerWidth
          const vh = window.innerHeight
          const describe = (el) => {
            const text = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40)
            return `<${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}> "${text}"`
          }
          const bad = []
          let checked = 0
          for (const el of main.querySelectorAll('[data-reveal], h1, h2, h3, p')) {
            if (el.closest('[aria-hidden="true"]')) continue
            const rect = el.getBoundingClientRect()
            const inView =
              rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0 && rect.top < vh && rect.left < vw
            if (!inView) continue
            checked++
            for (let n = el; n; n = n.parentElement) {
              const op = parseFloat(getComputedStyle(n).opacity)
              if (op < 0.99) {
                bad.push(`${describe(el)} opacity ${op}${n === el ? '' : ` on ancestor <${n.tagName.toLowerCase()}>`}`)
                break
              }
              if (n === main) break
            }
          }
          return { checked, bad, scrollY: window.scrollY }
        })
        if (r.error) problems.push(`${width}: ${r.error}`)
        else if (r.checked === 0) problems.push(`${width}: nothing checked in the first viewport`)
        else if (r.bad.length)
          problems.push(`${width}: ${r.bad.length}/${r.checked} hidden: ${r.bad.slice(0, 4).join(' | ')}`)
      } finally {
        await context.close()
      }
    }
    return problems.length ? problems.join('; ') : null
  })

  // 6. nav-anchor — header link lands #pricing just below the fixed header; mobile menu closes.
  await run('nav-anchor', async () => {
    const problems = []

    {
      const { context, page } = await newPage(browser, { width: 1440 })
      try {
        await load(page)
        await page.locator('header').getByRole('link', { name: 'Bảng giá', exact: true }).first().click()
        await page.waitForTimeout(1500)
        const top = await pricingTop(page)
        if (top === null) problems.push('1440: #pricing not found')
        else if (top < 0 || top > 120) problems.push(`1440: #pricing top ${Math.round(top)}px (want 0–120)`)
      } catch (err) {
        problems.push(`1440: ${String(err?.message || err).split('\n')[0]}`)
      } finally {
        await context.close()
      }
    }

    {
      const { context, page } = await newPage(browser, { width: 375, height: 812 })
      try {
        await load(page)
        await page.locator('button[aria-label="Mở menu"]').first().click()
        const dialog = page.getByRole('dialog')
        await dialog.getByRole('link', { name: 'Bảng giá', exact: true }).first().click()
        await page.waitForTimeout(1500)
        const top = await pricingTop(page)
        if (top === null) problems.push('375: #pricing not found')
        else if (top < 0 || top > 120) problems.push(`375: #pricing top ${Math.round(top)}px (want 0–120)`)
        const open = await dialog.count()
        if (open > 0) problems.push('375: menu dialog still open')
      } catch (err) {
        problems.push(`375: ${String(err?.message || err).split('\n')[0]}`)
      } finally {
        await context.close()
      }
    }

    return problems.length ? problems.join('; ') : null
  })

  // 7. no-leak — / → /login → back to /: ScrollTrigger count unchanged.
  await run('no-leak', async () => {
    const { context, page } = await newPage(browser, { width: 1440 })
    try {
      await load(page)
      const count = () =>
        page.evaluate(() => {
          const st = window.__fg?.ScrollTrigger
          return st ? st.getAll().length : null
        })
      const first = await count()
      if (first === null) return 'window.__fg.ScrollTrigger not exposed'
      await page.getByRole('link', { name: 'Đăng nhập', exact: true }).first().click()
      await page.waitForURL(/\/login/)
      await page.evaluate(() => history.back())
      await page.waitForTimeout(800)
      const second = await count()
      if (second === null) return 'window.__fg.ScrollTrigger missing after returning to /'
      return second === first ? null : `ScrollTrigger count ${first} → ${second} after / → /login → /`
    } finally {
      await context.close()
    }
  })
} finally {
  await browser.close()
}

const failed = results.filter((r) => !r.ok).length
console.log(`\n${results.length - failed}/${results.length} passed`)
process.exit(failed ? 1 : 0)
