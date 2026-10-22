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

// Deferred motion setup (lib/motion/defer.js) runs after first paint, one section per idle
// task; wait for that queue to drain (dev hook) so trigger counts and states are final.
async function settle(page) {
  await page
    .waitForFunction(() => !window.__fg?.deferPending || window.__fg.deferPending() === 0, null, { timeout: 10000 })
    .catch(() => {})
}

async function load(page, path = '/') {
  await page.goto(`${BASE}${path}`, { waitUntil: 'load' })
  await page.waitForTimeout(500)
  await settle(page)
}

// Header state: solid background flag, active nav link, live ScrollTrigger count.
async function headerState(page) {
  return page.evaluate(() => ({
    scrolled: document.querySelector('header')?.dataset.scrolled,
    active: document.querySelector('header nav a[aria-current]')?.textContent.trim() ?? null,
    triggers: window.__fg?.ScrollTrigger?.getAll().length ?? null,
  }))
}

// Scroll to the bottom in 10 steps, 150ms apart.
async function fullScroll(page) {
  for (let i = 1; i <= 10; i++) {
    await page.evaluate((f) => window.scrollTo(0, document.documentElement.scrollHeight * f), i / 10)
    await page.waitForTimeout(150)
  }
}

// CHECK_ONLY=name[,name] runs just those assertions (handy while iterating on one).
const ONLY = process.env.CHECK_ONLY ? process.env.CHECK_ONLY.split(',') : null

async function run(name, fn) {
  if (ONLY && !ONLY.includes(name)) return
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

  // 5c. count-up — animated numbers start from their final vi-VN value in the HTML, count up
  // smoothly once they are shown, never sit at 0, never change width, and are exposed to
  // assistive tech exactly once. 1440x900, normal motion (ScrollSmoother on):
  //  - after load at scroll 0 (stats bar far below, nothing triggered) each stat already reads its
  //    final value (0 is only written when the count actually starts);
  //  - jump with window.scrollTo so the stats bar is centred, sample every ~100ms for 2500ms: while
  //    a stat is visible (in the viewport, effective opacity >= 0.5) it never reads its zero form
  //    in two consecutive samples, its value never decreases and its painted width stays constant
  //    (±1px); at 2500ms every stat's *visible* text (text nodes with a real box, so .sr-only
  //    copies are skipped) is its final value (98,5% / 10.000+ / 500+ / 24/7);
  //  - the stats bar's accessible text (rendered text minus aria-hidden subtrees) contains each
  //    final value exactly once;
  //  - a fresh load at scroll 0, after 3000ms: hero KPIs read 128/96/12/86, distance 1.245.
  await run('count-up', async () => {
    const STAT_FINALS = ['98,5%', '10.000+', '500+', '24/7']
    const STAT_ZEROS = ['0,0%', '0+', '0+', null]
    const KPI_FINALS = ['128', '96', '12', '86']
    const DISTANCE_FINAL = '1.245'
    const problems = []

    // Page-side probe, installed as window.__countUpProbe.
    const PROBE = () => {
      // Text of the text nodes under `el` whose parent has a real box (skips .sr-only copies).
      const visibleText = (el) => {
        if (!el) return null
        const out = []
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          const r = n.parentElement.getBoundingClientRect()
          if (r.width > 1 && r.height > 1 && getComputedStyle(n.parentElement).visibility !== 'hidden') out.push(n.nodeValue)
        }
        return out.join('').replace(/\s+/g, ' ').trim()
      }
      // Painted horizontal extent of `el`'s content: union of descendant boxes > 1px and text runs,
      // in layout px (divided by any ancestor scale, e.g. an entrance scale-in).
      const extent = (el) => {
        let left = Infinity
        let right = -Infinity
        const add = (r) => {
          if (r.width > 1 && r.height > 1) {
            left = Math.min(left, r.left)
            right = Math.max(right, r.right)
          }
        }
        el.querySelectorAll('*').forEach((c) => add(c.getBoundingClientRect()))
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          if (n.parentElement.getBoundingClientRect().width <= 1) continue
          const range = document.createRange()
          range.selectNodeContents(n)
          add(range.getBoundingClientRect())
        }
        const scale = el.offsetWidth ? el.getBoundingClientRect().width / el.offsetWidth : 1
        return right > left ? (right - left) / (scale || 1) : 0
      }
      const opacity = (el) => {
        let o = 1
        for (let n = el; n && n !== document.documentElement; n = n.parentElement) o *= parseFloat(getComputedStyle(n).opacity)
        return o
      }
      const numbers = () => {
        const bar = document.querySelector('[data-stats-bar]')
        if (!bar) return []
        // [data-stat-number] marks the value line; fall back to each stat's first child.
        let nodes = bar.querySelectorAll('[data-stat-number]')
        if (!nodes.length) nodes = bar.querySelectorAll('[data-stat] > :first-child')
        return Array.from(nodes)
      }
      window.__countUpProbe = {
        visibleText,
        sample: () =>
          numbers().map((el) => {
            const r = el.getBoundingClientRect()
            return {
              text: visibleText(el),
              width: Math.round(extent(el) * 10) / 10,
              visible: r.bottom > 0 && r.top < window.innerHeight && opacity(el) >= 0.5,
            }
          }),
        a11yText: () => {
          const bar = document.querySelector('[data-stats-bar]')
          const parts = []
          const walker = document.createTreeWalker(bar, NodeFilter.SHOW_TEXT)
          for (let n = walker.nextNode(); n; n = walker.nextNode()) {
            const p = n.parentElement
            if (p.closest('[aria-hidden="true"]')) continue
            if (getComputedStyle(p).display === 'none') continue
            parts.push(n.nodeValue)
          }
          return parts.join(' ').replace(/\s+/g, ' ')
        },
      }
    }
    const num = (t) => parseFloat(String(t).replace(/[^\d,]/g, '').replace(',', '.'))

    {
      const { context, page } = await newPage(browser, { width: 1440, height: 900 })
      try {
        await load(page)
        await page.evaluate(PROBE)
        const target = await page.evaluate(() => {
          const bar = document.querySelector('[data-stats-bar]')
          if (!bar) return null
          const r = bar.getBoundingClientRect()
          return Math.round(r.top + window.scrollY + r.height / 2 - window.innerHeight / 2)
        })
        if (target === null) return '[data-stats-bar] not found'
        const before = await page.evaluate(() => window.__countUpProbe.sample())
        if (before.length !== STAT_FINALS.length) return `stats: ${before.length} value lines found, want ${STAT_FINALS.length}`
        const pre = STAT_FINALS.map((f, i) => (before[i].text === f ? null : `"${before[i].text}"≠"${f}"`)).filter(Boolean)
        if (pre.length) problems.push(`stats at scroll 0 before any trigger: ${pre.join(', ')} (final value must stay until the count starts)`)

        await page.evaluate((y) => window.scrollTo(0, y), target)
        const t0 = Date.now()
        const samples = []
        while (Date.now() - t0 < 2400) {
          samples.push({ t: Date.now() - t0, s: await page.evaluate(() => window.__countUpProbe.sample()) })
          await page.waitForTimeout(100)
        }
        await page.waitForTimeout(Math.max(0, 2500 - (Date.now() - t0)))
        const last = await page.evaluate(() => window.__countUpProbe.sample())

        STAT_FINALS.forEach((final, i) => {
          const vis = samples.filter((x) => x.s[i]?.visible).map((x) => ({ t: x.t, ...x.s[i] }))
          if (last[i]?.visible) vis.push({ t: 2500, ...last[i] })
          const zero = STAT_ZEROS[i]
          for (let k = 1; zero && k < vis.length; k++) {
            if (vis[k].text === zero && vis[k - 1].text === zero) {
              problems.push(`stat ${final}: visible at "${zero}" at ${vis[k - 1].t}ms and ${vis[k].t}ms`)
              break
            }
          }
          for (let k = 1; k < vis.length; k++) {
            if (num(vis[k].text) < num(vis[k - 1].text)) {
              problems.push(`stat ${final}: went down "${vis[k - 1].text}" → "${vis[k].text}" at ${vis[k].t}ms`)
              break
            }
          }
          const widths = vis.map((v) => v.width)
          if (widths.length && Math.max(...widths) - Math.min(...widths) > 1)
            problems.push(`stat ${final}: painted width ${Math.min(...widths)}–${Math.max(...widths)}px while visible`)
        })
        const wrong = STAT_FINALS.map((f, i) => (last[i]?.text === f ? null : `"${last[i]?.text}"≠"${f}"`)).filter(Boolean)
        if (wrong.length) problems.push(`stats visible after jump+2500ms: ${wrong.join(', ')}`)

        const a11y = await page.evaluate(() => window.__countUpProbe.a11yText())
        const dup = STAT_FINALS.map((f) => [f, a11y.split(f).length - 1]).filter(([, n]) => n !== 1)
        if (dup.length)
          problems.push(`stats accessible text "${a11y.trim().slice(0, 120)}": ${dup.map(([f, n]) => `"${f}"×${n}`).join(', ')} (want each once)`)
      } finally {
        await context.close()
      }
    }

    {
      const { context, page } = await newPage(browser, { width: 1440, height: 900 })
      try {
        await page.goto(`${BASE}/`, { waitUntil: 'load' })
        await page.waitForTimeout(3000)
        await page.evaluate(PROBE)
        const r = await page.evaluate(() => {
          const { visibleText } = window.__countUpProbe
          return {
            kpis: Array.from(document.querySelectorAll('#top [data-kpi] [data-count]')).map(visibleText),
            distance: visibleText(document.querySelector('#top [data-distance-count]')),
          }
        })
        if (r.kpis.join('/') !== KPI_FINALS.join('/')) problems.push(`hero KPIs after 3000ms "${r.kpis.join('/')}" (want ${KPI_FINALS.join('/')})`)
        if (r.distance !== DISTANCE_FINAL) problems.push(`hero distance after 3000ms "${r.distance}" (want ${DISTANCE_FINAL})`)
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
        const focused = await page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName)
        if (focused !== 'pricing') problems.push(`1440: focus on ${focused} after nav, want #pricing`)
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
        const focused = await page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName)
        if (focused !== 'pricing') problems.push(`375: focus on ${focused} after menu nav, want #pricing`)
      } catch (err) {
        problems.push(`375: ${String(err?.message || err).split('\n')[0]}`)
      } finally {
        await context.close()
      }
    }

    return problems.length ? problems.join('; ') : null
  })

  // 6b. nav-bottom — after a jump to max scroll the header is solid and the last nav item
  // ("Liên hệ", the short footer) is active (a trigger with end:'max' reports inactive at max
  // scroll, and a jump skips trigger callbacks).
  await run('nav-bottom', async () => {
    const problems = []
    for (const width of [1440, 375]) {
      const { context, page } = await newPage(browser, { width, height: width === 375 ? 812 : 900 })
      try {
        await load(page)
        // One jump straight to the bottom (like End / focusing a footer link): no intermediate
        // scroll positions for trigger callbacks to catch.
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
        await page.waitForTimeout(800)
        const s = await headerState(page)
        if (s.scrolled !== 'true') problems.push(`${width}: header data-scrolled=${s.scrolled} at bottom`)
        if (width === 1440 && s.active !== 'Liên hệ') problems.push(`${width}: active link "${s.active}" at bottom, want "Liên hệ"`)
      } finally {
        await context.close()
      }
    }
    return problems.length ? problems.join('; ') : null
  })

  // 6c. breakpoint-roundtrip — 1440 → 800 → 1440 must not kill navbar triggers (ScrollSmoother
  // creation used to nest other components' gsap contexts into its matchMedia context). After
  // the round trip, scrolled down: header solid, a link active, trigger count back to the start.
  await run('breakpoint-roundtrip', async () => {
    const { context, page } = await newPage(browser, { width: 1440, height: 900 })
    try {
      await load(page)
      const before = await headerState(page)
      if (before.triggers === null) return 'window.__fg.ScrollTrigger not exposed'
      await page.setViewportSize({ width: 800, height: 900 })
      await page.waitForTimeout(800)
      await settle(page)
      await page.setViewportSize({ width: 1440, height: 900 })
      await page.waitForTimeout(800)
      await settle(page)
      // Count before scrolling: one-shot reveal triggers (`once`) are killed as they fire.
      const { triggers } = await headerState(page)
      await page.evaluate(() => window.scrollTo(0, 2000))
      await page.waitForTimeout(1500)
      const after = await headerState(page)
      const problems = []
      if (after.scrolled !== 'true') problems.push(`data-scrolled=${after.scrolled} at y=2000`)
      if (!after.active) problems.push('no active nav link at y=2000')
      if (triggers !== before.triggers) problems.push(`ScrollTrigger count ${before.triggers} → ${triggers}`)
      return problems.length ? problems.join('; ') : null
    } finally {
      await context.close()
    }
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
      await settle(page)
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
