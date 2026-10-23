import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, ArrowRight, AlertCircle, Info } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import AuthShell, { AuthBanner, AuthField } from '@/components/auth/AuthShell'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const { login, loading } = useAuth()
  const navigate = useNavigate()

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
      title="Đăng nhập hệ thống"
      subtitle="Nền tảng giám sát an toàn tài xế AI thời gian thực"
      footer={
        <>
          <span>Chưa có tài khoản?</span>
          <Link
            to="/register"
            className="inline-flex min-h-11 items-center rounded-sm font-semibold text-brand-dark underline-offset-4 outline-none hover:underline focus-ring"
          >
            Đăng ký trải nghiệm
          </Link>
        </>
      }
    >
      <div className="flex flex-col gap-5">
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
            autoComplete="email"
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
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button type="submit" size="lg" className="mt-2 w-full" loading={loading}>
            <span>{loading ? 'Đang xác thực...' : 'Đăng nhập'}</span>
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Button>
        </form>
      </div>
    </AuthShell>
  )
}
