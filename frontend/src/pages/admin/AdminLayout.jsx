import { useState, useEffect, useRef } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Grid,
  Users,
  History,
  FileText,
  Route,
  ClipboardList,
  Bot,
  LogOut,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react'
import FleetGuardLogo from '@/components/brand/FleetGuardLogo'
import { useAuth } from '../../context/AuthContext'
import { getSocket } from '../../api/socket'
import { updateDB } from '../../store/db'
import { ToastContainer, toast } from '../../components/common/Toast'
import styles from './AdminLayout.module.css'

export default function AdminLayout() {
  const { user, organization, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('fleetguard_admin_sidebar_collapsed') === 'true'
  })
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Handle clicking outside user dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [dropdownOpen])

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('fleetguard_admin_sidebar_collapsed', String(next))
      return next
    })
  }

  // Cross-tab Level 2 alert listener
  useEffect(() => {
    let channel = null
    try {
      channel = new BroadcastChannel('fleetguard_channel')
      channel.onmessage = (event) => {
        if (event.data?.type === 'LEVEL2_ALERT' && event.data?.payload) {
          toast.level2(event.data.payload)
        }
      }
    } catch (e) {
      console.warn('BroadcastChannel error in AdminLayout', e)
    }

    return () => {
      if (channel) channel.close()
    }
  }, [])

  useEffect(() => {
    const socket = getSocket()
    const handleIncident = (payload) => {
      if (!payload || payload.organization_id !== user?.organizationId) return
      updateDB((db) => {
        if (db.incidents.some((incident) => incident._id === payload.alert_id)) return db
        db.incidents.unshift({
          _id: payload.alert_id,
          tripId: payload.session_id || null,
          driverId: payload.driver_id,
          organizationId: payload.organization_id,
          ts: payload.timestamp || new Date().toISOString(),
          type: payload.status === 'DROWSY' ? 'DROWSY' : payload.status === 'YAWNING' ? 'YAWN' : payload.status,
          metrics: `EAR ${payload.ear} · MAR ${payload.mar} · PERCLOS ${payload.perclos}`,
          level: payload.alert_level,
          status: 'open',
          resolvedBy: null,
          note: '',
        })
        return db
      }, { action: 'SOCKET_INCIDENT', incident: payload })
      if (payload.alert_level === 2) toast.level2(payload)
    }
    socket.on('alert:incident', handleIncident)
    return () => socket.off('alert:incident', handleIncident)
  }, [user?.organizationId])

  const handleLogout = () => {
    setDropdownOpen(false)
    logout()
    navigate('/login')
  }

  const getPageTitle = () => {
    const path = location.pathname
    if (path.includes('/cameras')) return 'Camera Giám Sát Đội Xe (Live Wall)'
    if (path.includes('/employees')) return 'Quản Lý Đội Ngũ Nhân Viên'
    if (path.includes('/history')) return 'Nhật Ký Sự Cố & An Toàn'
    if (path.includes('/reports')) return 'Báo Cáo & Phân Tích An Toàn'
    if (path.includes('/trips')) return 'Lịch Sử Chuyến Đi'
    if (path.includes('/audit-log')) return 'Audit Log'
    return 'Trung Tâm Điều Hành Đội Xe'
  }

  return (
    <div className={styles.layout}>
      <aside className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ''}`}>
        <div className={`${styles.sidebarBrand} ${collapsed ? styles.sidebarBrandCollapsed : ''}`}>
          <div className={styles.brandMain}>
            <FleetGuardLogo variant="default" showWordmark={!collapsed} style={{ fontSize: 20 }} />
          </div>
          <button
            type="button"
            className={styles.collapseBtn}
            onClick={toggleCollapse}
            title={collapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng (Minimize)'}
            aria-label={collapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng (Minimize)'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <nav className={styles.navGroup} style={{ paddingTop: '16px' }}>
          <NavLink
            to="/admin"
            end
            title="Tổng Quan"
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
            }
          >
            <LayoutDashboard size={18} />
            <span>Tổng Quan</span>
          </NavLink>

          <NavLink
            to="/admin/cameras"
            title="Camera Đội Xe"
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
            }
          >
            <Grid size={18} />
            <span>Camera Đội Xe</span>
          </NavLink>

          <NavLink
            to="/admin/employees"
            title="Nhân Viên"
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
            }
          >
            <Users size={18} />
            <span>Nhân Viên</span>
          </NavLink>

          <NavLink
            to="/admin/history"
            title="Lịch Sử Sự Cố"
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
            }
          >
            <History size={18} />
            <span>Lịch Sử Sự Cố</span>
          </NavLink>

          <NavLink
            to="/admin/trips"
            title="Lịch Sử Chuyến Đi"
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
          >
            <Route size={18} />
            <span>Lịch Sử Chuyến Đi</span>
          </NavLink>

          <NavLink
            to="/admin/audit-log"
            title="Audit Log"
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
          >
            <ClipboardList size={18} />
            <span>Audit Log</span>
          </NavLink>

          <NavLink
            to="/admin/reports"
            title="Báo Cáo An Toàn"
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
            }
          >
            <FileText size={18} />
            <span>Báo Cáo An Toàn</span>
          </NavLink>

          <NavLink
            to="/admin/chat"
            title="Trợ lý AI"
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
            }
          >
            <Bot size={18} />
            <span>Trợ lý AI</span>
          </NavLink>
        </nav>
      </aside>

      <div className={`${styles.mainWrapper} ${collapsed ? styles.mainWrapperCollapsed : ''}`}>
        <header className={styles.topbar}>
          <h2 className={styles.topbarTitle}>{getPageTitle()}</h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'var(--green-bg)',
                border: '1px solid var(--green-border)',
                color: 'var(--green-dark)',
                padding: '6px 14px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              <ShieldCheck size={14} />
              <span>Giám Sát 24/7</span>
            </div>

            {/* User Dropdown Header (Synced with DriverLayout) */}
            <div className={styles.userDropdownWrapper} ref={dropdownRef}>
              <button
                type="button"
                className={styles.userCardBtn}
                onClick={() => setDropdownOpen((prev) => !prev)}
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
              >
                <div
                  className={styles.userAvatar}
                  style={{ backgroundColor: user?.avatarColor || '#F59E0B' }}
                  title={user?.name || 'Quản trị viên'}
                >
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
                </div>
                <div className={styles.userInfoText}>
                  <div className={styles.userName}>{user?.name || 'Quản trị viên'}</div>
                  <div className={styles.userSub}>
                    {organization?.name || 'Quản trị hệ thống'}
                  </div>
                </div>
                <ChevronDown
                  size={16}
                  className={`${styles.dropdownChevron} ${dropdownOpen ? styles.dropdownChevronOpen : ''}`}
                />
              </button>

              {dropdownOpen && (
                <div className={styles.dropdownMenu}>
                  <div className={styles.dropdownHeader}>
                    <div className={styles.dropdownName}>{user?.name || 'Quản trị viên'}</div>
                    <div className={styles.dropdownSub}>{user?.email}</div>
                    <div style={{ fontSize: '11px', color: 'var(--amber-dark)', fontWeight: 700, marginTop: 4 }}>
                      {organization?.name || 'Doanh Nghiệp'} (Admin)
                    </div>
                  </div>
                  <div className={styles.dropdownDivider} />
                  <button
                    type="button"
                    className={styles.dropdownItemLogout}
                    onClick={handleLogout}
                  >
                    <LogOut size={16} />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className={styles.content}>
          <Outlet />
        </main>
      </div>

      <ToastContainer />
    </div>
  )
}
