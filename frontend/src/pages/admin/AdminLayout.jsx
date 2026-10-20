import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router-dom'
import {
  LayoutDashboard,
  Grid,
  Users,
  Truck,
  History,
  FileText,
  Bot,
  Camera,
  RotateCcw,
  LogOut,
  ShieldCheck,
  Building2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import SamsaraLogo from '../../components/SamsaraLogo'
import { useAuth } from '../../context/AuthContext'
import { resetDemo, getDB } from '../../store/db'
import { ToastContainer, toast } from '../../components/common/Toast'
import styles from './AdminLayout.module.css'

export default function AdminLayout() {
  const { user, organization, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('fleetguard_admin_sidebar_collapsed') === 'true'
  })

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

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleResetDemo = () => {
    if (window.confirm('Bạn có chắc chắn muốn đặt lại dữ liệu demo 30 ngày ban đầu?')) {
      resetDemo()
      toast.success('Thành công', 'Đã đặt lại toàn bộ dữ liệu mẫu ban đầu!')
    }
  }

  const getPageTitle = () => {
    const path = location.pathname
    if (path.includes('/cameras')) return 'Camera Giám Sát Đội Xe (Live Wall)'
    if (path.includes('/employees')) return 'Quản Lý Đội Ngũ Nhân Viên'
    if (path.includes('/vehicles')) return 'Quản Lý Phương Tiện Vận Tải'
    if (path.includes('/history')) return 'Nhật Ký Sự Cố & Hành Trình Đội Xe'
    if (path.includes('/reports')) return 'Báo Cáo & Phân Tích An Toàn'
    return 'Trung Tâm Điều Hành Đội Xe'
  }

  const activeVehiclesCount = () => {
    const db = getDB()
    const active = db.vehicles.filter((v) => v.status === 'driving').length
    return `${active}/${db.vehicles.length}`
  }

  return (
    <div className={styles.layout}>
      <aside className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ''}`}>
        <div className={`${styles.sidebarBrand} ${collapsed ? styles.sidebarBrandCollapsed : ''}`}>
          <div className={styles.brandMain}>
            <SamsaraLogo size={28} color="#0F172A" accentColor="#F59E0B" />
            {!collapsed && (
              <span className={styles.brandText}>
                Fleet<span className={styles.brandAccent}>Guard</span>
              </span>
            )}
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

        <div className={`${styles.orgCard} ${collapsed ? styles.orgCardCollapsed : ''}`}>
          {collapsed ? (
            <div
              className={styles.orgIconCollapsed}
              title={`${organization?.name || 'Vận Tải Phương Nam'} (Gói Chuyên Nghiệp)`}
            >
              <Building2 size={18} />
            </div>
          ) : (
            <>
              <div className={styles.orgName}>
                {organization?.name || 'Vận Tải Phương Nam'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className={styles.orgPlanBadge}>Gói Chuyên Nghiệp</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{user?.name}</span>
              </div>
            </>
          )}
        </div>

        <nav className={styles.navGroup}>
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
            to="/admin/vehicles"
            title="Quản Lý Xe"
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
            }
          >
            <Truck size={18} />
            <span>Quản Lý Xe</span>
          </NavLink>

          <NavLink
            to="/admin/history"
            title="Lịch Sử & Sự Cố"
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
            }
          >
            <History size={18} />
            <span>Lịch Sử & Sự Cố</span>
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

          <div
            className={`${styles.navItem} ${styles.navItemDisabled}`}
            title="Trợ lý AI đang được tích hợp"
          >
            <Bot size={18} />
            <span>Trợ lý AI (sắp ra mắt)</span>
          </div>
        </nav>

        <div className={styles.sidebarFooter}>
          <Link to="/driver/camera" className={styles.actionBtn} title="Mở Buồng Lái (Camera)">
            <Camera size={16} />
            <span>Mở Buồng Lái (Camera)</span>
          </Link>

          <button
            className={`${styles.actionBtn} ${styles.resetBtn}`}
            onClick={handleResetDemo}
            title="Reset Dữ Liệu Demo"
          >
            <RotateCcw size={15} />
            <span>Reset Dữ Liệu Demo</span>
          </button>

          <button
            className={`${styles.actionBtn} ${styles.logoutBtn}`}
            onClick={handleLogout}
            title="Đăng xuất"
          >
            <LogOut size={16} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      <div className={`${styles.mainWrapper} ${collapsed ? styles.mainWrapperCollapsed : ''}`}>
        <header className={styles.topbar}>
          <h2 className={styles.topbarTitle}>{getPageTitle()}</h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'var(--blue-bg)',
                border: '1px solid var(--blue-border)',
                color: 'var(--blue-dark)',
                padding: '6px 14px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
              }}
            >
              <span>XE ĐANG CHẠY: {activeVehiclesCount()}</span>
            </div>

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
