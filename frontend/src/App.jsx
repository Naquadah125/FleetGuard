import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

// Public Pages
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

// Driver Area
import DriverLayout from './pages/driver/DriverLayout'
import DriverOverview from './pages/driver/DriverOverview'
import DriverCamera from './pages/driver/DriverCamera'
import DriverHistory from './pages/driver/DriverHistory'

// Admin Area
import AdminLayout from './pages/admin/AdminLayout'
import AdminOverview from './pages/admin/AdminOverview'
import AdminCameras from './pages/admin/AdminCameras'
import AdminEmployees from './pages/admin/AdminEmployees'
import AdminVehicles from './pages/admin/AdminVehicles'
import AdminHistory from './pages/admin/AdminHistory'
import AdminReports from './pages/admin/AdminReports'

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
          <Route path="vehicles" element={<AdminVehicles />} />
          <Route path="history" element={<AdminHistory />} />
          <Route path="reports" element={<AdminReports />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
