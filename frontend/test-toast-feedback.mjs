import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const toastSource = await readFile(new URL('./src/components/common/Toast.jsx', import.meta.url), 'utf8')
const stylesSource = await readFile(new URL('./src/components/common/Common.module.css', import.meta.url), 'utf8')

assert.match(
  toastSource,
  /error:\s*\(title,\s*desc\)\s*=>\s*toast\.show\(\{\s*title,\s*desc,\s*type:\s*'error'/s,
  'toast.error should publish an error-typed item',
)
assert.match(toastSource, /const isError = t\.type === 'error'/)
assert.match(toastSource, /styles\.toastError/)
assert.match(stylesSource, /\.toastError\b/)

console.log('Toast error feedback contract test passed.')
