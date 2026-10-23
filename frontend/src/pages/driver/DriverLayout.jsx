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
  UserRound,
  Menu,
  X,
} from 'lucide-react'
import FleetGuardLogo from '@/components/brand/FleetGuardLogo'
import { useAuth } from '../../context/AuthContext'
import { ToastContainer } from '../../components/common/Toast'
import styles from './DriverLayout.module.css'

export default function DriverLayout() {
  const { user, organization, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('fleetguard_driver_sidebar_collapsed') === 'true'
  })
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)
  const menuButtonRef = useRef(null)
  const navigationRef = useRef(null)
  const [navigationOpen, setNavigationOpen] = useState(false)

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

  useEffect(() => {
    if (!navigationOpen) return
    const getFocusableItems = () =>
      Array.from(navigationRef.current?.querySelectorAll('a[href], button:not([disabled])') || [])
        .filter((item) => item.getClientRects().length > 0)
    getFocusableItems()[0]?.focus()
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setNavigationOpen(false)
        menuButtonRef.current?.focus()
        return
      }
      if (event.key === 'Tab') {
        const items = getFocusableItems()
        const first = items[0]
        const last = items[items.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [navigationOpen])

  useEffect(() => {
    setNavigationOpen(false)
  }, [location.pathname])

  const closeNavigation = () => {
    setNavigationOpen(false)
    if (navigationOpen) menuButtonRef.current?.focus()
  }

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('fleetguard_driver_sidebar_collapsed', String(next))
      return next
    })
  }

  const handleLogout = () => {
    setDropdownOpen(false)
    setNavigationOpen(false)
    logout()
    navigate('/login')
  }

  // Determine page title
  const getPageTitle = () => {
    const path = location.pathname
    if (path.includes('/camera')) return 'Buồng Lái & Camera Giám Sát'
    if (path.includes('/history')) return 'Lịch Sử Chuyến Đi & Sự Cố'
    if (path.includes('/chat')) return 'Trợ lý AI'
    if (path.includes('/profile')) return 'Hồ Sơ Cá Nhân'
    return 'Tổng Quan Tài Xế'
  }

  return (
    <div className={styles.layout}>
      <aside
        ref={navigationRef}
        id="driver-navigation-drawer"
        className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ''} ${navigationOpen ? styles.navigationOpen : ''}`}
      >
        <div className={`${styles.sidebarBrand} ${collapsed ? styles.sidebarBrandCollapsed : ''}`}>
          <div className={styles.brandMain}>
            <FleetGuardLogo variant="default" showWordmark={!collapsed || navigationOpen} style={{ fontSize: 20 }} />
          </div>
          <button
            type="button"
            className={styles.mobileDrawerClose}
            aria-label="Đóng menu điều hướng"
            onClick={closeNavigation}
          >
            <X size={20} />
          </button>
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

        <nav className={styles.navGroup} style={{ paddingTop: '16px' }} onClick={closeNavigation}>
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

          <NavLink
            to="/driver/chat"
            title="Trợ lý AI"
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
            }
          >
            <Bot size={18} />
            <span>Trợ lý AI</span>
          </NavLink>
        </nav>
        <div className={styles.mobileAccount}>
          <div className={styles.mobileUser}>
            <div
              className={styles.userAvatar}
              style={{ backgroundColor: user?.avatarColor || '#2563EB' }}
              title={user?.name || 'Tài xế'}
            >
              {user?.avatarImage
                ? <img src={user.avatarImage} alt="" />
                : (user?.name ? user.name.charAt(0).toUpperCase() : 'T')}
            </div>
            <div className={styles.userInfoText}>
              <div className={styles.userName}>{user?.name || 'Tài xế'}</div>
              <div className={styles.userSub}>{organization?.name || 'Tài xế buồng lái'}</div>
            </div>
          </div>
          <NavLink
            to="/driver/profile"
            className={styles.mobileAccountItem}
            onClick={closeNavigation}
          >
            <UserRound size={18} />
            <span>Chỉnh sửa thông tin</span>
          </NavLink>
          <button
            type="button"
            className={`${styles.mobileAccountItem} ${styles.mobileLogout}`}
            onClick={handleLogout}
          >
            <LogOut size={18} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>
      {navigationOpen && (
        <button
          type="button"
          className={styles.drawerBackdrop}
          aria-label="Đóng menu"
          onClick={closeNavigation}
        />
      )}

      <div className={`${styles.mainWrapper} ${collapsed ? styles.mainWrapperCollapsed : ''}`}>
        <header className={styles.topbar}>
          <button
            ref={menuButtonRef}
            type="button"
            className={styles.mobileMenuButton}
            aria-label={navigationOpen ? 'Đóng menu điều hướng' : 'Mở menu điều hướng'}
            aria-expanded={navigationOpen}
            aria-controls="driver-navigation-drawer"
            onClick={() => setNavigationOpen((open) => !open)}
          >
            {navigationOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
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
                {user?.avatarImage
                  ? <img src={user.avatarImage} alt="" />
                  : (user?.name ? user.name.charAt(0).toUpperCase() : 'T')}
              </div>
              <div className={styles.userInfoText}>
                <div className={styles.userName}>{user?.name || 'Tài xế'}</div>
                <div className={styles.userSub}>
                  {organization?.name || 'Tài xế buồng lái'}
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
                  <div className={styles.dropdownName}>{user?.name || 'Tài xế'}</div>
                  <div className={styles.dropdownSub}>
                    {organization?.name || 'Tài khoản buồng lái'}
                  </div>
                </div>
                <div className={styles.dropdownDivider} />
                <button
                  type="button"
                  className={styles.dropdownItem}
                  onClick={() => { setDropdownOpen(false); navigate('/driver/profile') }}
                >
                  <UserRound size={16} />
                  <span>Chỉnh sửa thông tin</span>
                </button>
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
