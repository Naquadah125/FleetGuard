import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Mail, Lock, Building2, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import AuthShell, { AuthBanner, AuthField } from '@/components/auth/AuthShell'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

const TYPE_ITEM_CLASS =
  'h-11 w-full gap-2 rounded-sm px-3 text-body font-semibold text-ink hover:bg-white/70 hover:text-navy data-[state=on]:bg-white data-[state=on]:text-brand-dark data-[state=on]:shadow-[0_1px_3px_rgba(13,34,50,0.12)] [&_svg:not([class*=size-])]:size-[15px]'

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
    <AuthShell
      title="Tạo tài khoản mới"
      subtitle="Gia nhập nền tảng an toàn vận tải thông minh"
      footer={
        <>
          <span>Đã có tài khoản?</span>
          <Link
            to="/login"
            className="inline-flex min-h-11 items-center rounded-sm font-semibold text-brand-dark underline-offset-4 outline-none hover:underline focus-ring"
          >
            Đăng nhập
          </Link>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {/* Account Type Selector — a single choice that can never be cleared */}
        <ToggleGroup
          type="single"
          value={accountType}
          onValueChange={(value) => value && setAccountType(value)}
          spacing={1}
          aria-label="Loại tài khoản"
          className="grid w-full grid-cols-2 rounded-md bg-surface p-1"
        >
          <ToggleGroupItem value="DRIVER" className={TYPE_ITEM_CLASS}>
            <User aria-hidden="true" />
            <span>Tài xế cá nhân</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="ADMIN" className={TYPE_ITEM_CLASS}>
            <Building2 aria-hidden="true" />
            <span>Công ty / đội xe</span>
          </ToggleGroupItem>
        </ToggleGroup>

        {error && (
          <AuthBanner tone="danger" icon={AlertCircle}>
            {error}
          </AuthBanner>
        )}

        {success && (
          <AuthBanner tone="success" icon={CheckCircle2}>
            {success}
          </AuthBanner>
        )}

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          {accountType === 'ADMIN' && (
            <AuthField
              id="orgName"
              label="Tên công ty / tổ chức"
              icon={Building2}
              type="text"
              placeholder="Công ty Vận Tải XYZ..."
              autoComplete="organization"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              required
            />
          )}

          <AuthField
            id="name"
            label="Họ và tên"
            icon={User}
            type="text"
            placeholder="Nguyễn Văn A"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <AuthField
            id="reg-email"
            label="Email"
            icon={Mail}
            type="email"
            placeholder="name@fleet.vn"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <AuthField
            id="reg-password"
            label="Mật khẩu"
            icon={Lock}
            type="password"
            hint="Tối thiểu 6 ký tự"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />

          <Button type="submit" size="lg" className="mt-2 w-full" loading={loading}>
            <span>{loading ? 'Đang khởi tạo...' : accountType === 'ADMIN' ? 'Đăng ký gói chuyên nghiệp' : 'Bắt đầu miễn phí'}</span>
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Button>
        </form>
      </div>
    </AuthShell>
  )
}
