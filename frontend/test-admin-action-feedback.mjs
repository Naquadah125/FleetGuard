import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const chatSource = await readFile(new URL('./src/pages/admin/AdminChat.jsx', import.meta.url), 'utf8')

assert.match(
  chatSource,
  /downloadFile\('fleetguard-admin-ai\.json'[\s\S]{0,250}toast\.success\(/,
  'JSON export should confirm after starting the download',
)
assert.match(
  chatSource,
  /exportCsv\(latestResult\)[\s\S]{0,250}toast\.success\(/,
  'CSV export should confirm after starting the download',
)

console.log('Admin action feedback contract test passed.')
