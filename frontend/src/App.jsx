import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

// Public Pages. Only the landing page is in the entry chunk; every other route is split into its
// own chunk so `/` does not download, parse or evaluate the auth pages and dashboards.
import HomePage from './pages/HomePage'
const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))

// Dashboards use JetBrains Mono (var(--font-mono)); load its @font-face CSS with their layouts.
const withMonoFont = (load) => () =>
  Promise.all([import('@fontsource-variable/jetbrains-mono'), load()]).then(([, mod]) => mod)

// Driver Area
const DriverLayout = lazy(withMonoFont(() => import('./pages/driver/DriverLayout')))
const DriverOverview = lazy(() => import('./pages/driver/DriverOverview'))
const DriverCamera = lazy(() => import('./pages/driver/DriverCamera'))
const DriverHistory = lazy(() => import('./pages/driver/DriverHistory'))
const DriverChat = lazy(() => import('./pages/driver/DriverChat'))

// Admin Area
const AdminLayout = lazy(withMonoFont(() => import('./pages/admin/AdminLayout')))
const AdminOverview = lazy(() => import('./pages/admin/AdminOverview'))
const AdminCameras = lazy(() => import('./pages/admin/AdminCameras'))
const AdminEmployees = lazy(() => import('./pages/admin/AdminEmployees'))
const AdminHistory = lazy(() => import('./pages/admin/AdminHistory'))
const AdminReports = lazy(() => import('./pages/admin/AdminReports'))
const AdminChat = lazy(() => import('./pages/admin/AdminChat'))
const AdminTrips = lazy(() => import('./pages/admin/AdminTrips'))
const AdminAuditLog = lazy(() => import('./pages/admin/AdminAuditLog'))

// Route Guard
function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // If page requires Admin but user is Driver, redirect to /driver
  if (requireAdmin && user?.role !== 'ADMIN') {
    return <Navigate to="/driver" replace />
  }

  return children
}

export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={null}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/user" element={<Navigate to="/driver" replace />} />

          {/* Driver Area (ADMIN allowed, DRIVER allowed) */}
          <Route
            path="/driver"
            element={
              <ProtectedRoute>
                <DriverLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DriverOverview />} />
            <Route path="camera" element={<DriverCamera />} />
            <Route path="history" element={<DriverHistory />} />
            <Route path="chat" element={<DriverChat />} />
          </Route>

          {/* Admin Area (ADMIN only, plan pro) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminOverview />} />
            <Route path="cameras" element={<AdminCameras />} />
            <Route path="employees" element={<AdminEmployees />} />
            <Route path="history" element={<AdminHistory />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="chat" element={<AdminChat />} />
            <Route path="trips" element={<AdminTrips />} />
            <Route path="audit-log" element={<AdminAuditLog />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  )
}
