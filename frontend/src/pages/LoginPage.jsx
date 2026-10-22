import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, ArrowRight, Key, AlertCircle, Info } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import AuthShell, { AuthBanner, AuthField } from '@/components/auth/AuthShell'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const QUICK_BTN_CLASS =
  'h-auto min-h-11 gap-1 border-line px-3 py-2 leading-snug text-navy hover:border-brand sm:flex-col sm:gap-0'

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
    <AuthShell
      title="ĐĂNG NHẬP HỆ THỐNG"
      subtitle="Nền tảng giám sát an toàn tài xế AI thời gian thực"
      footer={
        <>
          <span>Chưa có tài khoản?</span>
          <Link
            to="/register"
            className="rounded-sm font-semibold text-brand-dark underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
          >
            Đăng ký trải nghiệm
          </Link>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {/* Quick Demo Credentials Fill */}
        <div className="flex flex-col gap-3 rounded-md border border-dashed border-brand/40 bg-brand-50/60 p-3.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-body-sm font-semibold text-brand-dark">
            <Key className="size-3.5" aria-hidden="true" />
            <span>Tài Khoản Kiểm Thử Nhanh</span>
            <Badge variant="neutral" className="bg-white font-medium text-ink ring-1 ring-line">
              Mật khẩu: fleet1234
            </Badge>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              className={QUICK_BTN_CLASS}
              onClick={() => handleQuickFill('user@fleet.vn')}
            >
              <span className="font-semibold">Tài Xế</span>{' '}
              <span className="font-medium text-ink">(user@fleet.vn)</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              className={QUICK_BTN_CLASS}
              onClick={() => handleQuickFill('admin@fleet.vn')}
            >
              <span className="font-semibold">Quản Trị</span>{' '}
              <span className="font-medium text-ink">(admin@fleet.vn)</span>
            </Button>
          </div>
        </div>

        {notice && (
          <AuthBanner tone="info" icon={Info}>
            {notice}
          </AuthBanner>
        )}

        {error && (
          <AuthBanner tone="danger" icon={AlertCircle}>
            {error}
          </AuthBanner>
        )}

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <AuthField
            id="email"
            label="Email đăng nhập"
            icon={Mail}
            type="email"
            placeholder="name@fleet.vn"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <AuthField
            id="password"
            label="Mật khẩu"
            icon={Lock}
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button type="submit" size="lg" className="mt-2 w-full" loading={loading}>
            <span>{loading ? 'Đang xác thực...' : 'Đăng Nhập'}</span>
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Button>
        </form>
      </div>
    </AuthShell>
  )
}
