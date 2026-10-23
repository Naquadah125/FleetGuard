import { useEffect, useState } from 'react'
import { ArrowLeft, ImagePlus, LockKeyhole, Save, ShieldCheck, UserRound } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { toast } from '../../components/common/Toast'
import styles from './ProfilePage.module.css'

const maxAvatarFileBytes = 10 * 1024 * 1024
const maxAvatarImageBytes = 512 * 1024
const avatarSize = 256
const roleLabels = {
  USER: 'Người dùng',
  DRIVER: 'Tài xế',
  ADMIN: 'Quản trị viên',
  FLEET_ADMIN: 'Quản trị đội xe',
}

async function normalizeAvatarImage(file) {
  const imageUrl = URL.createObjectURL(file)
  try {
    const image = new Image()
    await new Promise((resolve, reject) => {
      image.onload = resolve
      image.onerror = () => reject(new Error('Không thể đọc ảnh. Hãy chọn tệp JPEG, PNG hoặc WebP.'))
      image.src = imageUrl
    })

    const cropSize = Math.min(image.naturalWidth, image.naturalHeight)
    const canvas = document.createElement('canvas')
    canvas.width = avatarSize
    canvas.height = avatarSize
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Trình duyệt không thể xử lý ảnh này.')

    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, avatarSize, avatarSize)
    context.drawImage(
      image,
      (image.naturalWidth - cropSize) / 2,
      (image.naturalHeight - cropSize) / 2,
      cropSize,
      cropSize,
      0,
      0,
      avatarSize,
      avatarSize,
    )

    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.86)
    })
    if (!blob) throw new Error('Trình duyệt không thể xử lý ảnh này.')
    if (blob.size > maxAvatarImageBytes) {
      throw new Error('Ảnh sau khi xử lý vượt quá 512 KB. Hãy chọn ảnh khác.')
    }

    return await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') resolve(reader.result)
        else reject(new Error('Không thể đọc ảnh đã xử lý. Hãy thử lại.'))
      }
      reader.onerror = () => reject(new Error('Không thể đọc ảnh đã xử lý. Hãy thử lại.'))
      reader.readAsDataURL(blob)
    })
  } finally {
    URL.revokeObjectURL(imageUrl)
  }
}

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
    gender: user?.gender || '',
    phone: user?.phone || '',
    dateOfBirth: user?.dateOfBirth || '',
    avatarColor: user?.avatarColor || '#2563EB',
    avatarImage: user?.avatarImage || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [saving, setSaving] = useState(false)
  const [avatarError, setAvatarError] = useState('')
  const backPath = location.pathname.startsWith('/admin') ? '/admin' : '/driver'
  const passwordEnabled = Boolean(form.currentPassword || form.newPassword || form.confirmPassword)

  useEffect(() => {
    setForm((current) => ({
      ...current,
      name: user?.name || '',
      gender: user?.gender || '',
      phone: user?.phone || '',
      dateOfBirth: user?.dateOfBirth || '',
      avatarColor: user?.avatarColor || '#2563EB',
      avatarImage: user?.avatarImage || '',
    }))
  }, [user?.name, user?.gender, user?.phone, user?.dateOfBirth, user?.avatarColor, user?.avatarImage])

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }))

  const handleAvatarFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setAvatarError('Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP.')
      return
    }
    if (file.size > maxAvatarFileBytes) {
      setAvatarError('Ảnh gốc vượt quá 10 MB. Hãy chọn ảnh nhỏ hơn.')
      return
    }

    setAvatarError('')
    try {
      updateField('avatarImage', await normalizeAvatarImage(file))
    } catch (error) {
      setAvatarError(error.message)
    }
  }

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
          gender: form.gender,
          avatarColor: form.avatarColor,
          avatarImage: form.avatarImage,
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
      <div className={styles.layout}>
        <form className={styles.form} onSubmit={handleSubmit}>
          <section className={styles.section}>
            <div className={styles.sectionTitle}><UserRound size={18} /><div><h2>Thông tin cơ bản</h2><p>Email đăng nhập chỉ được xem, không thể đổi tại đây.</p></div></div>
            <label>Email đăng nhập<input value={user?.email || ''} readOnly /></label>
            <label>Họ tên<input value={form.name} onChange={(event) => updateField('name', event.target.value)} required /></label>
            <label>
              Giới tính
              <select value={form.gender} onChange={(event) => updateField('gender', event.target.value)}>
                <option value="">Chưa chọn</option>
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
                <option value="Khác">Khác</option>
              </select>
            </label>
            <label>Số điện thoại<input value={form.phone} onChange={(event) => updateField('phone', event.target.value)} inputMode="numeric" maxLength={10} required /></label>
            <label>Ngày sinh<input value={form.dateOfBirth} onChange={(event) => updateField('dateOfBirth', event.target.value)} placeholder="DD-MM-YYYY" maxLength={10} required /></label>
            <fieldset className={styles.avatarField}>
              <legend className={styles.avatarLegend}>Ảnh đại diện</legend>
              <div className={styles.avatarControls}>
                <div className={styles.avatarSample} style={{ backgroundColor: form.avatarColor }}>
                  {form.avatarImage ? <img src={form.avatarImage} alt="" /> : <span>{form.name.trim().charAt(0).toUpperCase() || 'F'}</span>}
                </div>
                <div className={styles.avatarActions}>
                  <label className={styles.uploadButton}>
                    <ImagePlus size={16} aria-hidden="true" />
                    Chọn ảnh
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      aria-label="Chọn ảnh đại diện"
                      onChange={handleAvatarFile}
                    />
                  </label>
                  <p className={styles.uploadHint}>JPEG, PNG hoặc WebP. Ảnh gốc tối đa 10 MB.</p>
                  {avatarError && <p className={styles.avatarError} role="alert">{avatarError}</p>}
                </div>
              </div>
            </fieldset>
          </section>
          <section className={styles.section}>
            <div className={styles.sectionTitle}><LockKeyhole size={18} /><div><h2>Đổi mật khẩu</h2><p>Để trống nếu bạn chưa muốn đổi mật khẩu.</p></div></div>
            <label>Mật khẩu hiện tại<input type="password" value={form.currentPassword} onChange={(event) => updateField('currentPassword', event.target.value)} autoComplete="current-password" /></label>
            <label>Mật khẩu mới<input type="password" value={form.newPassword} onChange={(event) => updateField('newPassword', event.target.value)} autoComplete="new-password" /></label>
            <label>Xác nhận mật khẩu mới<input type="password" value={form.confirmPassword} onChange={(event) => updateField('confirmPassword', event.target.value)} autoComplete="new-password" /></label>
          </section>
          <button className={styles.save} type="submit" disabled={saving}><Save size={16} /> {saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
        </form>
        <aside className={styles.preview} aria-label="Xem trước thẻ hồ sơ">
          <div className={styles.identityCard}>
            <div className={styles.cardHeading}>
              <span className={styles.cardBrand}><ShieldCheck size={18} aria-hidden="true" /> FleetGuard</span>
              <span className={styles.cardPreviewLabel}>Xem trước</span>
            </div>
            <div className={styles.cardIdentity}>
              <div className={styles.cardAvatar} style={{ backgroundColor: form.avatarColor }}>
                {form.avatarImage ? <img src={form.avatarImage} alt="" /> : <span>{form.name.trim().charAt(0).toUpperCase() || 'F'}</span>}
              </div>
              <div className={styles.cardName}>
                <p>{roleLabels[user?.role] || 'Tài khoản FleetGuard'}</p>
                <h2>{form.name.trim() || 'Chưa có họ tên'}</h2>
              </div>
            </div>
            <dl className={styles.cardDetails}>
              <div className={styles.cardDetailFull}><dt>Email</dt><dd>{user?.email || 'Chưa có email'}</dd></div>
              <div><dt>Số điện thoại</dt><dd>{form.phone || 'Chưa cập nhật'}</dd></div>
              <div><dt>Giới tính</dt><dd>{form.gender || 'Chưa cập nhật'}</dd></div>
              <div><dt>Ngày sinh</dt><dd>{form.dateOfBirth || 'Chưa cập nhật'}</dd></div>
              <div><dt>Đơn vị</dt><dd>{user?.organizationName || 'FleetGuard'}</dd></div>
            </dl>
          </div>
          <p className={styles.previewHint}>Thông tin thẻ thay đổi theo nội dung bạn đang chỉnh sửa.</p>
        </aside>
      </div>
    </section>
  )
}
