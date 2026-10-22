// Dev-only preview of the section atmosphere system (Phase 6). Open /preview-backdrops.html on the
// Vite dev server. Every variant is stacked full-width at 900px in page order with dummy copy and
// cards so seams and contrast can be judged; ScrollSmoother runs (desktop) so data-speed parallax
// and the idle drift are live; the floating contact CTA is mounted outside the smoother.
//   ?static  hides all text/cards (backdrop-only capture for the contrast probe)
// Not part of the production build (vite build only bundles index.html).
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/index.css'
import SectionBackdrop from '@/components/landing/decor/SectionBackdrop'
import { SECTION_BACKDROPS, VARIANTS } from '@/components/landing/decor/backdrops'
import SmoothScroll from '@/components/landing/SmoothScroll'
import FloatingContact from '@/components/landing/FloatingContact'
import MotionPauseButton from '@/components/landing/MotionPauseButton'

const backdropOnly = new URLSearchParams(window.location.search).has('static')

function Card({ title }) {
  return (
    <div className="rounded-lg border border-line bg-white p-5 shadow-card">
      <p className="text-body font-semibold text-navy">{title}</p>
      <p className="mt-1 text-body text-ink">Thẻ nội dung giữ nền trắng; chỉ nền section được tô màu.</p>
    </div>
  )
}

function Panel({ row, index }) {
  const v = VARIANTS[row.variant]
  return (
    <section
      id={`bd-${row.variant}`}
      data-panel={row.variant}
      className="relative isolate h-[900px] overflow-hidden"
    >
      <SectionBackdrop variant={row.variant} />
      <div className={backdropOnly ? 'invisible' : undefined}>
        <div className="container-page flex h-full flex-col gap-10 pt-24">
          <div className="flex flex-col items-center gap-3 text-center">
            <p data-probe="brand-dark" className="text-body font-semibold text-brand-dark">
              {index + 1}. #{row.section} · variant “{row.variant}” · pattern {v.pattern} · tone {v.tone}
            </p>
            <h2 data-probe="navy" className="heading-section text-navy">Tiêu đề section trên nền {row.variant}</h2>
            <p data-probe="ink" className="max-w-[560px] text-body-lg text-ink">
              Văn bản thân bài màu ink trên nền tint — seam trên {row.seamTop}, seam dưới {row.seamBottom}.
            </p>
            {index === 0 ? <MotionPauseButton /> : null}
          </div>
          <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center">
            <div className="flex flex-col gap-3">
              <p data-probe="brand" className="text-h3 font-bold text-brand">199.000đ chữ lớn brand</p>
              <p data-probe="ink" className="text-body text-ink">
                Cột trái: mô tả ngắn đặt trực tiếp trên nền (không có thẻ) để đo độ tương phản ở rìa trái.
              </p>
              <p data-probe="brand-dark" className="text-body font-semibold text-brand-dark">Liên kết brand-dark 14px</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Card title="Thẻ trắng A" />
              <Card title="Thẻ trắng B" />
            </div>
          </div>
          <div className="flex justify-between gap-4">
            <p data-probe="ink" className="text-body text-ink">Góc trái dưới — chữ ink</p>
            <p data-probe="navy" className="text-body font-semibold text-navy">Góc phải dưới — chữ navy</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function App() {
  return (
    <>
      <SmoothScroll>
        <main>
          {SECTION_BACKDROPS.map((row, i) => (
            <Panel key={row.variant} row={row} index={i} />
          ))}
        </main>
        <footer id="contact" className="bg-footer py-24 text-center text-white/80">
          <p className="text-body">Footer (#contact) — nhịp sáng của nút hotline tạm dừng khi khối này hiển thị.</p>
        </footer>
      </SmoothScroll>
      <FloatingContact />
    </>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
