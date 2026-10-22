// Dev-only preview for DriverIllustration: http://localhost:5173/preview-driver.html
// Not part of the production build (vite only builds index.html).
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import DriverIllustration, { DRIVER_STATES } from '@/components/illustrations/DriverIllustration'

const META = {
  normal: { label: 'Bình thường', caption: 'Tài xế tập trung lái xe', dot: '#22C55E' },
  drowsy: { label: 'Ngủ gật', caption: 'Phát hiện dấu hiệu buồn ngủ', dot: '#F59E0B' },
  fatigued: { label: 'Mệt mỏi', caption: 'Cảnh báo tài xế mệt mỏi', dot: '#F59E0B' },
  distracted: { label: 'Mất tập trung', caption: 'Phát hiện mất tập trung', dot: '#EF4444' },
}

const card = {
  background: '#fff',
  border: '1px solid #E2E8F0',
  borderRadius: 16,
  padding: '18px 16px 16px',
  boxShadow: '0 6px 20px rgba(13,34,50,.06)',
}

function Label({ state }) {
  const m = META[state]
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 700, fontSize: 17, marginBottom: 12 }}>
      <span style={{ width: 10, height: 10, borderRadius: 99, background: m.dot }} />
      {m.label}
    </div>
  )
}

function Preview() {
  const [big, setBig] = useState('normal')
  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 16px 64px' }}>
      <h1 style={{ fontSize: 20, margin: '0 0 20px' }}>DriverIllustration — 4 states</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
        {DRIVER_STATES.map((s) => (
          <div key={s} style={card}>
            <Label state={s} />
            <DriverIllustration state={s} />
            <p style={{ textAlign: 'center', fontSize: 14, color: '#334155', margin: '12px 0 0' }}>{META[s].caption}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, margin: '36px 0 12px', flexWrap: 'wrap' }}>
        {DRIVER_STATES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setBig(s)}
            style={{
              padding: '8px 14px',
              borderRadius: 999,
              border: '1px solid #CBD5E1',
              background: big === s ? '#08765E' : '#fff',
              color: big === s ? '#fff' : '#0D2232',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {META[s].label}
          </button>
        ))}
      </div>
      <div style={{ ...card, maxWidth: 640 }}>
        <Label state={big} />
        <DriverIllustration state={big} />
      </div>

      <h2 style={{ fontSize: 16, margin: '36px 0 12px' }}>Large, all states</h2>
      <div id="large-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
        {DRIVER_STATES.map((s) => (
          <div key={s} style={card}>
            <Label state={s} />
            <DriverIllustration state={s} />
          </div>
        ))}
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Preview />
  </StrictMode>,
)
