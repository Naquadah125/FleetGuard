// Dev-only preview of decor illustrations + brand logo. Open /preview-decor.html on the Vite dev server.
// Not part of the production build (vite build only bundles index.html).
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import AiChip from '@/components/illustrations/AiChip.jsx'
import CitySkyline from '@/components/illustrations/CitySkyline.jsx'
import DeliveryTruck from '@/components/illustrations/DeliveryTruck.jsx'
import LeafBranch from '@/components/illustrations/LeafBranch.jsx'
import PhoneMap from '@/components/illustrations/PhoneMap.jsx'
import PottedPlant from '@/components/illustrations/PottedPlant.jsx'
import RoadBand from '@/components/illustrations/RoadBand.jsx'
import SedanCar from '@/components/illustrations/SedanCar.jsx'
import FleetGuardLogo, { FleetGuardMark } from '@/components/brand/FleetGuardLogo.jsx'

const ASSETS = [
  ['DeliveryTruck', (p) => <DeliveryTruck {...p} style={{ width: 300 }} />],
  ['SedanCar', (p) => <SedanCar {...p} style={{ width: 280 }} />],
  ['PottedPlant', (p) => <PottedPlant {...p} style={{ height: 260 }} />],
  ['LeafBranch', (p) => <LeafBranch {...p} style={{ height: 260 }} />],
  ['PhoneMap', (p) => <PhoneMap {...p} style={{ height: 280 }} />],
  ['AiChip', (p) => <AiChip {...p} style={{ width: 160 }} />],
  ['CitySkyline', (p) => <CitySkyline {...p} style={{ width: '100%', height: 200, display: 'block' }} />],
  ['RoadBand', (p) => <RoadBand {...p} style={{ width: '100%', height: 140, display: 'block' }} />],
]

const BGS = [
  ['white', '#FFFFFF'],
  ['mint', '#ECFDF5'],
]

const label = { fontSize: 12, fontWeight: 600, color: '#334155', margin: '0 0 8px', letterSpacing: '0.02em' }
const tile = (bg) => ({
  background: bg,
  borderRadius: 16,
  border: '1px solid #E2E8F0',
  padding: 16,
  minHeight: 300,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
})

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 16px' }}>{title}</h2>
      {children}
    </section>
  )
}

function Preview() {
  return (
    <main style={{ maxWidth: 1240, margin: '0 auto', padding: '32px 16px 64px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 24px' }}>FleetGuard — decor &amp; logo preview</h1>

      <Section title="Logo">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          <div style={{ ...tile('#FFFFFF'), minHeight: 160, flexDirection: 'column', gap: 20 }}>
            <FleetGuardLogo style={{ fontSize: 22 }} />
            <FleetGuardLogo style={{ fontSize: 36 }} />
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <FleetGuardMark style={{ width: 16, height: 16 }} />
              <FleetGuardMark style={{ width: 32, height: 32 }} />
              <FleetGuardMark style={{ width: 64, height: 64 }} title="FleetGuard" />
              <img src="/favicon.svg" alt="favicon" width="32" height="32" />
            </div>
          </div>
          <div style={{ ...tile('#0B3B33'), minHeight: 160, flexDirection: 'column', gap: 20 }}>
            <FleetGuardLogo variant="light" style={{ fontSize: 22 }} />
            <FleetGuardLogo variant="light" style={{ fontSize: 36 }} />
            <FleetGuardLogo variant="light" showWordmark={false} style={{ fontSize: 36 }} />
          </div>
        </div>
      </Section>

      {BGS.map(([name, bg]) => (
        <Section key={name} title={`Illustrations on ${name} (${bg})`}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
            {ASSETS.slice(0, 6).map(([n, render]) => (
              <div key={n}>
                <p style={label}>{n}</p>
                <div style={tile(bg)}>{render({})}</div>
              </div>
            ))}
          </div>
          {ASSETS.slice(6).map(([n, render]) => (
            <div key={n} style={{ marginTop: 16 }}>
              <p style={label}>{n}</p>
              <div style={{ ...tile(bg), minHeight: 0, padding: 0, overflow: 'hidden' }}>{render({})}</div>
            </div>
          ))}
        </Section>
      ))}

      <Section title="Composition check (pricing band)">
        <div style={{ position: 'relative', height: 220, background: '#F3F8F6', borderRadius: 16, overflow: 'hidden' }}>
          <RoadBand style={{ position: 'absolute', inset: '30px 0 0', width: '100%', height: 170 }} />
          <SedanCar style={{ position: 'absolute', left: '6%', top: 70, width: 200 }} />
          <DeliveryTruck style={{ position: 'absolute', right: '6%', top: 34, width: 240 }} />
        </div>
      </Section>
    </main>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Preview />
  </StrictMode>,
)
