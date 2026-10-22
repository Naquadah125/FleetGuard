// Dev-only preview of landing sections. Open /preview-landing.html on the Vite dev server.
//   ?s=<FileName>  renders the default export of src/components/landing/<FileName>.jsx
//   ?s=__ui        renders the shadcn primitives sheet (buttons, inputs, badges)
//   (no ?s)        lists the available sections
// Not part of the production build (vite build only bundles index.html).
import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@/index.css'

const modules = import.meta.glob('/src/components/landing/*.jsx')
const sections = Object.fromEntries(
  Object.entries(modules).map(([file, load]) => [file.split('/').pop().replace(/\.jsx$/, ''), load]),
)
// Resolved once at module level: a lazy() created during render would re-suspend forever.
const requested = new URLSearchParams(window.location.search).get('s')
const Selected =
  requested === '__ui'
    ? lazy(() => import('./ui-sheet.jsx'))
    : requested && sections[requested]
      ? lazy(sections[requested])
      : null

function SectionIndex({ missing }) {
  const names = Object.keys(sections).sort()
  return (
    <div className="container-page flex flex-col gap-4 py-10">
      <h1 className="text-h2 text-navy">Landing preview</h1>
      {missing ? (
        <p className="text-body text-danger">
          No section named “{missing}” in src/components/landing/.
        </p>
      ) : null}
      <ul className="flex flex-col gap-2 text-body-lg">
        <li>
          <a className="text-brand-dark underline-offset-4 hover:underline" href="?s=__ui">
            __ui — primitives sheet
          </a>
        </li>
        {names.map((name) => (
          <li key={name}>
            <a className="text-brand-dark underline-offset-4 hover:underline" href={`?s=${name}`}>
              {name}
            </a>
          </li>
        ))}
      </ul>
      {names.length === 0 ? (
        <p className="text-body text-ink">No files in src/components/landing/ yet.</p>
      ) : null}
    </div>
  )
}

function Preview() {
  return Selected ? <Selected /> : <SectionIndex missing={requested} />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Suspense fallback={null}>
        <Preview />
      </Suspense>
    </BrowserRouter>
  </StrictMode>,
)
