import { useEffect, useState } from 'react'
import { ArrowLeft, LockKeyhole, Save, UserRound } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { toast } from '../../components/common/Toast'
import styles from './ProfilePage.module.css'

const colors = ['#2563EB', '#0F766E', '#B45309', '#BE123C', '#7C3AED']

function isValidBirthDate(value) {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value)
  if (!match) return false
  const [, day, month, year] = match
  const date = new Date(Number(year), Number(month) - 1, Number(day))
  if (date.getFullYear() !== Number(year) || date.getMonth() !== Number(month) - 1 || date.getDate() !== Number(day)) return false
  const today = new Date()
  let age = today.getFullYear() - Number(year)
  if (today.getMonth() + 1 < Number(month) || (today.getMonth() + 1 === Number(month) && today.getDate() < Number(day))) age -= 1
  return age >= 16 && age <= 100
}

export default function ProfilePage() {
  const { user, token, updateUser } = useAuth()
  const location = useLocation()
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    dateOfBirth: user?.dateOfBirth || '',
    avatarColor: user?.avatarColor || '#2563EB',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [saving, setSaving] = useState(false)
  const backPath = location.pathname.startsWith('/admin') ? '/admin' : '/driver'
  const passwordEnabled = Boolean(form.currentPassword || form.newPassword || form.confirmPassword)

  useEffect(() => {
    setForm((current) => ({
      ...current,
      name: user?.name || '',
      phone: user?.phone || '',
      dateOfBirth: user?.dateOfBirth || '',
      avatarColor: user?.avatarColor || '#2563EB',
    }))
  }, [user?.name, user?.phone, user?.dateOfBirth, user?.avatarColor])

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }))

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!form.name.trim()) return toast.show({ title: 'Thiếu họ tên', desc: 'Vui lòng nhập họ tên.' })
    if (!/^0\d{9}$/.test(form.phone)) return toast.show({ title: 'Số điện thoại chưa đúng', desc: 'Nhập số Việt Nam gồm 10 chữ số.' })
    if (!isValidBirthDate(form.dateOfBirth)) return toast.show({ title: 'Ngày sinh chưa đúng', desc: 'Dùng dạng DD-MM-YYYY, tuổi từ 16 đến 100.' })
    if (passwordEnabled && (!form.currentPassword || !form.newPassword || !form.confirmPassword)) return toast.show({ title: 'Thiếu thông tin mật khẩu', desc: 'Vui lòng nhập đủ ba trường mật khẩu.' })
    if (passwordEnabled && form.newPassword.length < 6) return toast.show({ title: 'Mật khẩu quá ngắn', desc: 'Mật khẩu mới cần ít nhất 6 ký tự.' })
    if (passwordEnabled && form.newPassword !== form.confirmPassword) return toast.show({ title: 'Mật khẩu chưa khớp', desc: 'Hai mật khẩu mới phải giống nhau.' })

    setSaving(true)
    try {
      const response = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone,
          dateOfBirth: form.dateOfBirth,
          avatarColor: form.avatarColor,
          ...(passwordEnabled ? {
            currentPassword: form.currentPassword,
            newPassword: form.newPassword,
            confirmPassword: form.confirmPassword,
          } : {}),
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.success) throw new Error(data.message || 'Không thể cập nhật hồ sơ.')
      updateUser(data.user)
      setForm((current) => ({ ...current, currentPassword: '', newPassword: '', confirmPassword: '' }))
      toast.success('Đã lưu hồ sơ', 'Thông tin cá nhân đã được cập nhật.')
    } catch (error) {
      toast.show({ title: 'Không thể lưu hồ sơ', desc: error.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className={styles.page}>
      <div className={styles.heading}>
        <Link className={styles.backLink} to={backPath}><ArrowLeft size={16} /> Quay lại</Link>
        <p className={styles.eyebrow}>TÀI KHOẢN CÁ NHÂN</p>
        <h1>Chỉnh sửa thông tin</h1>
        <p>Cập nhật thông tin hiển thị và bảo mật tài khoản của bạn.</p>
      </div>
      <form className={styles.form} onSubmit={handleSubmit}>
        <section className={styles.section}>
          <div className={styles.sectionTitle}><UserRound size={18} /><div><h2>Thông tin cơ bản</h2><p>Email đăng nhập chỉ được xem, không thể đổi tại đây.</p></div></div>
          <label>Email đăng nhập<input value={user?.email || ''} readOnly /></label>
          <label>Họ tên<input value={form.name} onChange={(event) => updateField('name', event.target.value)} required /></label>
          <label>Số điện thoại<input value={form.phone} onChange={(event) => updateField('phone', event.target.value)} inputMode="numeric" maxLength={10} required /></label>
          <label>Ngày sinh<input value={form.dateOfBirth} onChange={(event) => updateField('dateOfBirth', event.target.value)} placeholder="DD-MM-YYYY" maxLength={10} required /></label>
          <fieldset className={styles.avatarField}><legend className={styles.avatarLegend}>Màu avatar</legend><div className={styles.colors}>{colors.map((color) => <button key={color} type="button" aria-label={`Chọn màu ${color}`} className={`${styles.color} ${form.avatarColor === color ? styles.colorSelected : ''}`} style={{ backgroundColor: color }} onClick={() => updateField('avatarColor', color)} />)}</div></fieldset>
        </section>
        <section className={styles.section}>
          <div className={styles.sectionTitle}><LockKeyhole size={18} /><div><h2>Đổi mật khẩu</h2><p>Để trống nếu bạn chưa muốn đổi mật khẩu.</p></div></div>
          <label>Mật khẩu hiện tại<input type="password" value={form.currentPassword} onChange={(event) => updateField('currentPassword', event.target.value)} autoComplete="current-password" /></label>
          <label>Mật khẩu mới<input type="password" value={form.newPassword} onChange={(event) => updateField('newPassword', event.target.value)} autoComplete="new-password" /></label>
          <label>Xác nhận mật khẩu mới<input type="password" value={form.confirmPassword} onChange={(event) => updateField('confirmPassword', event.target.value)} autoComplete="new-password" /></label>
        </section>
        <button className={styles.save} type="submit" disabled={saving}><Save size={16} /> {saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
      </form>
    </section>
  )
}
