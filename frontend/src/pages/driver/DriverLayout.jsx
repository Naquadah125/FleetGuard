import { useState, useRef, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Camera,
  History,
  Bot,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react'
import FleetGuardLogo from '@/components/brand/FleetGuardLogo'
import { useAuth } from '../../context/AuthContext'
import { ToastContainer } from '../../components/common/Toast'
import styles from './DriverLayout.module.css'

export default function DriverLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('fleetguard_driver_sidebar_collapsed') === 'true'
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
      localStorage.setItem('fleetguard_driver_sidebar_collapsed', String(next))
      return next
    })
  }

  const handleLogout = () => {
    setDropdownOpen(false)
    logout()
    navigate('/login')
  }

  // Determine page title
  const getPageTitle = () => {
    const path = location.pathname
    if (path.includes('/camera')) return 'Buồng Lái & Camera Giám Sát'
    if (path.includes('/history')) return 'Lịch Sử Chuyến Đi & Sự Cố'
    return 'Tổng Quan Tài Xế'
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
            title={collapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
            aria-label={collapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <nav className={styles.navGroup} style={{ paddingTop: '16px' }}>
          <NavLink
            to="/driver"
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
            to="/driver/camera"
            title="Camera Buồng Lái"
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
            }
          >
            <Camera size={18} />
            <span>Camera Buồng Lái</span>
          </NavLink>

          <NavLink
            to="/driver/history"
            title="Lịch Sử Hành Trình"
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
            }
          >
            <History size={18} />
            <span>Lịch Sử Hành Trình</span>
          </NavLink>

          <div
            className={`${styles.navItem} ${styles.navItemDisabled}`}
            title="Tính năng đang được phát triển"
          >
            <Bot size={18} />
            <span>Trợ lý AI (sắp ra mắt)</span>
          </div>
        </nav>
      </aside>

      <div className={`${styles.mainWrapper} ${collapsed ? styles.mainWrapperCollapsed : ''}`}>
        <header className={styles.topbar}>
          <h2 className={styles.topbarTitle}>{getPageTitle()}</h2>

          {/* User Card with Dropdown */}
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
                style={{ backgroundColor: user?.avatarColor || '#2563EB' }}
                title={user?.name || 'Tài xế'}
              >
                {user?.name ? user.name.charAt(0).toUpperCase() : 'T'}
              </div>
              <div className={styles.userInfoText}>
                <div className={styles.userName}>{user?.name || 'Nguyễn Văn Lái Xe'}</div>
                <div className={styles.userSub}>
                  {user?.vehicleId ? 'Xe: ' + user.vehicleId : 'Xe: veh_free_1'}
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
                  <div className={styles.dropdownName}>{user?.name || 'Nguyễn Văn Lái Xe'}</div>
                  <div className={styles.dropdownSub}>
                    {user?.vehicleId ? 'Phương tiện: ' + user.vehicleId : 'Xe: veh_free_1'}
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
        </header>

        <main className={styles.content}>
          <Outlet />
        </main>
      </div>

      <ToastContainer />
    </div>
  )
}
