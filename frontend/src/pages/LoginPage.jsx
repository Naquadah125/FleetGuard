import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, ArrowRight, ArrowLeft, Key, AlertCircle, Info } from 'lucide-react'
import SamsaraLogo from '../components/SamsaraLogo'
import { useAuth } from '../context/AuthContext'
import styles from './Auth.module.css'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const { login, loading } = useAuth()
  const navigate = useNavigate()

  const handleQuickFill = (demoEmail) => {
    setEmail(demoEmail)
    setPassword('fleet1234')
    setError('')
    setNotice('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setNotice('')

    try {
      const res = await login(email, password)
      if (res.isMock) {
        setNotice('Đã kích hoạt phiên làm việc Local Offline')
      }

      if (res.user.role === 'ADMIN') {
        navigate('/admin')
      } else {
        navigate('/driver')
      }
    } catch (err) {
      setError(err.message || 'Sai thông tin đăng nhập hoặc tài khoản không tồn tại')
    }
  }

  return (
    <div className={styles.authWrapper}>
      <Link to="/" className={styles.backHome}>
        <ArrowLeft size={16} />
        <span>Về trang chủ</span>
      </Link>

      <div className={styles.authCard}>
        <div className={styles.cardHeader}>
          <Link to="/" className={styles.cardLogo}>
            <SamsaraLogo size={34} color="#0F172A" accentColor="#F59E0B" />
            <span className={styles.logoText}>
              Fleet<span className={styles.logoAccent}>Guard</span>
            </span>
          </Link>
          <h1 className={styles.cardTitle}>ĐĂNG NHẬP HỆ THỐNG</h1>
          <p className={styles.cardSubtitle}>Nền tảng giám sát an toàn tài xế AI thời gian thực</p>
        </div>

        {/* Quick Demo Credentials Fill */}
        <div className={styles.quickAccounts}>
          <div className={styles.quickHeader}>
            <Key size={13} />
            <span>Tài Khoản Kiểm Thử Nhanh (Mật khẩu: fleet1234)</span>
          </div>
          <div className={styles.quickButtons}>
            <button
              type="button"
              className={styles.quickBtn}
              onClick={() => handleQuickFill('user@fleet.vn')}
            >
              Tài Xế (user@fleet.vn)
            </button>
            <button
              type="button"
              className={styles.quickBtn}
              onClick={() => handleQuickFill('admin@fleet.vn')}
            >
              Quản Trị (admin@fleet.vn)
            </button>
          </div>
        </div>

        {notice && (
          <div className={styles.noticeBanner}>
            <Info size={14} />
            <span>{notice}</span>
          </div>
        )}

        {error && (
          <div className={styles.errorBanner} style={{ marginBottom: 16 }}>
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="email">Email đăng nhập</label>
            <div className={styles.inputWrapper}>
              <Mail className={styles.inputIcon} size={18} />
              <input
                id="email"
                type="email"
                className={styles.input}
                placeholder="name@fleet.vn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="password">Mật khẩu</label>
            <div className={styles.inputWrapper}>
              <Lock className={styles.inputIcon} size={18} />
              <input
                id="password"
                type="password"
                className={styles.input}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading}
          >
            <span>{loading ? 'Đang xác thực...' : 'Đăng Nhập'}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        <div className={styles.cardFooter}>
          <span>Chưa có tài khoản?</span>
          <Link to="/register">Đăng ký trải nghiệm</Link>
        </div>
      </div>
    </div>
  )
}
