import assert from 'node:assert/strict'
import fs from 'node:fs'

const app = fs.readFileSync('./src/App.jsx', 'utf8')
const adminLayout = fs.readFileSync('./src/pages/admin/AdminLayout.jsx', 'utf8')
const driverLayout = fs.readFileSync('./src/pages/driver/DriverLayout.jsx', 'utf8')

assert.match(app, /path="profile" element={<ProtectedRoute allowedRoles=\{\['ADMIN', 'FLEET_ADMIN'\]\}><ProfilePage \/><\/ProtectedRoute>} \/>/)
assert.match(app, /path="profile" element={<ProtectedRoute allowedRoles=\{\['USER', 'DRIVER'\]\}><DriverProfilePage \/><\/ProtectedRoute>} \/>/)
assert.match(app, /allowedRoles=\{\['USER', 'DRIVER'\]\}/)
assert.match(app, /allowedRoles=\{\['ADMIN', 'FLEET_ADMIN'\]\}/)
assert.match(adminLayout, /Chỉnh sửa thông tin/)
assert.match(driverLayout, /Chỉnh sửa thông tin/)
assert.match(fs.readFileSync('./src/pages/profile/ProfilePage.jsx', 'utf8'), /dateOfBirth/)
assert.match(fs.readFileSync('./src/pages/profile/ProfilePage.jsx', 'utf8'), /readOnly/)
assert.match(fs.readFileSync('./src/pages/profile/ProfilePage.jsx', 'utf8'), /updateUser\(data\.user\)/)
assert.match(fs.readFileSync('./src/context/AuthContext.jsx', 'utf8'), /avatarColor: nextUser\.avatarColor/)
console.log('Profile page UI contract test passed.')
