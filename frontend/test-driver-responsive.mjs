import assert from 'node:assert/strict'
import fs from 'node:fs'

const driverLayout = fs.readFileSync('./src/pages/driver/DriverLayout.jsx', 'utf8')
const driverStyles = fs.readFileSync('./src/pages/driver/DriverLayout.module.css', 'utf8')
const driverPages = fs.readFileSync('./src/pages/driver/DriverPages.module.css', 'utf8')
const driverChat = fs.readFileSync('./src/pages/driver/DriverChat.module.css', 'utf8')
const driverHistory = fs.readFileSync('./src/pages/driver/DriverHistory.jsx', 'utf8')

assert.match(driverLayout, /aria-controls="driver-navigation-drawer"/)
assert.match(driverLayout, /aria-expanded=\{navigationOpen\}/)
assert.match(driverLayout, /setNavigationOpen/)
assert.match(driverLayout, /className=\{styles\.mobileDrawerClose\}/)
assert.match(driverLayout, /path\.includes\('\/chat'\).*'Trợ lý AI'/s)
assert.match(driverStyles, /@media\s*\(max-width:\s*900px\)/)
assert.match(driverStyles, /\.navigationOpen/)
assert.match(driverPages, /@media\s*\(max-width:\s*900px\)[\s\S]*?\.cameraLayout\s*\{[^}]*grid-template-columns:\s*(?:1fr|minmax\(0,\s*1fr\))/s)
assert.match(driverChat, /@media\s*\(max-width:\s*900px\)[\s\S]*?\.layout\s*\{[^}]*grid-template-columns:\s*1fr/s)
assert.match(driverHistory, /className=\{styles\.historyFilterOptions\}/)
assert.match(driverPages, /@media\s*\(max-width:\s*640px\)[\s\S]*?\.historyFilterOptions\s*\{[^}]*overflow-x:\s*auto/s)

console.log('Driver responsive shell contract test passed.')
