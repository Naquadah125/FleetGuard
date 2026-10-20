import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Mail, Lock, Building2, ArrowRight, ArrowLeft, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react'
import SamsaraLogo from '../components/SamsaraLogo'
import { useAuth } from '../context/AuthContext'
import styles from './Auth.module.css'

export default function RegisterPage() {
  const [accountType, setAccountType] = useState('DRIVER') // 'DRIVER' or 'ADMIN'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [orgName, setOrgName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { register, loading } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (accountType === 'ADMIN' && !orgName.trim()) {
      setError('Vui lòng nhập tên công ty hoặc tổ chức đội xe')
      return
    }

    try {
      const res = await register({
        name,
        email,
        password,
        role: accountType,
        orgName,
      })

      setSuccess('Đăng ký tài khoản thành công! Đang chuyển hướng...')
      setTimeout(() => {
        if (res.user.role === 'ADMIN') {
          navigate('/admin')
        } else {
          navigate('/driver')
        }
      }, 900)
    } catch (err) {
      setError(err.message || 'Lỗi đăng ký tài khoản')
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
          <h1 className={styles.cardTitle}>TẠO TÀI KHOẢN MỚI</h1>
          <p className={styles.cardSubtitle}>Gia nhập nền tảng an toàn vận tải thông minh</p>
        </div>

        {/* Account Type Selector */}
        <div className={styles.typeSelector}>
          <button
            type="button"
            className={`${styles.typeBtn} ${accountType === 'DRIVER' ? styles.typeBtnActive : ''}`}
            onClick={() => setAccountType('DRIVER')}
          >
            <User size={15} />
            <span>Tài xế cá nhân</span>
          </button>
          <button
            type="button"
            className={`${styles.typeBtn} ${accountType === 'ADMIN' ? styles.typeBtnActive : ''}`}
            onClick={() => setAccountType('ADMIN')}
          >
            <Building2 size={15} />
            <span>Công ty / đội xe</span>
          </button>
        </div>

        {error && (
          <div className={styles.errorBanner} style={{ marginBottom: 16 }}>
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className={styles.successBanner} style={{ marginBottom: 16 }}>
            <CheckCircle2 size={15} />
            <span>{success}</span>
          </div>
        )}

        <form className={styles.form} onSubmit={handleSubmit}>
          {accountType === 'ADMIN' && (
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="orgName">Tên công ty / tổ chức</label>
              <div className={styles.inputWrapper}>
                <Building2 className={styles.inputIcon} size={18} />
                <input
                  id="orgName"
                  type="text"
                  className={styles.input}
                  placeholder="Công ty Vận Tải XYZ..."
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="name">Họ và tên</label>
            <div className={styles.inputWrapper}>
              <User className={styles.inputIcon} size={18} />
              <input
                id="name"
                type="text"
                className={styles.input}
                placeholder="Nguyễn Văn A"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="reg-email">Email</label>
            <div className={styles.inputWrapper}>
              <Mail className={styles.inputIcon} size={18} />
              <input
                id="reg-email"
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
            <label className={styles.label} htmlFor="reg-password">Mật khẩu</label>
            <div className={styles.inputWrapper}>
              <Lock className={styles.inputIcon} size={18} />
              <input
                id="reg-password"
                type="password"
                className={styles.input}
                placeholder="Tối thiểu 6 ký tự"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading}
          >
            <span>{loading ? 'Đang khởi tạo...' : accountType === 'ADMIN' ? 'Đăng Ký Gói Chuyên Nghiệp' : 'Bắt Đầu Miễn Phí'}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        <div className={styles.cardFooter}>
          <span>Đã có tài khoản?</span>
          <Link to="/login">Đăng nhập</Link>
        </div>
      </div>
    </div>
  )
}
