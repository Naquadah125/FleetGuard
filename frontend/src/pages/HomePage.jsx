import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Eye,
  AlertTriangle,
  Smile,
  Volume2,
  Smartphone,
  Bot,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Zap,
  Check,
  X,
  CreditCard,
  Building2,
  User,
  Cpu,
  Layers,
  Database,
  Radio,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import HeroSection from '../components/HeroSection'
import SamsaraLogo from '../components/SamsaraLogo'
import styles from './HomePage.module.css'

const FEATURES = [
  {
    icon: Eye,
    title: 'Cảnh Báo Ngủ Gật',
    desc: 'Hú còi tức thì khi tài xế nhắm mắt quá 1.5s, ngăn ngừa tai nạn.',
    badge: 'Phản ứng < 1.5s',
  },
  {
    icon: AlertTriangle,
    title: 'Cảnh Báo Mệt Mỏi',
    desc: 'Nhận diện ngáp liên tục, nhắc tài xế dừng xe nghỉ ngơi kịp thời.',
    badge: 'Cảnh báo sớm',
  },
  {
    icon: Smartphone,
    title: 'Nhắc Tập Trung',
    desc: 'Báo động khi tài xế nhìn điện thoại hoặc rời mắt khỏi đường quá 2s.',
    badge: 'Chống nhìn điện thoại',
  },
  {
    icon: Smile,
    title: 'Giảm Căng Thẳng',
    desc: 'Nhận biết áp lực khi kẹt xe, giúp tài xế giữ bình tĩnh lái xe.',
    badge: 'Lái xe an toàn',
  },
  {
    icon: Volume2,
    title: 'Còi Báo Trong Xe',
    desc: 'Còi báo vang rõ từ thiết bị, hoạt động ngay cả khi mất sóng mạng.',
    badge: 'Vang rõ trong xe',
  },
  {
    icon: Bot,
    title: 'Trợ Lý Đội Xe',
    desc: 'Tự động thống kê sự cố và chấm điểm an toàn từng tài xế.',
    badge: 'Báo cáo tự động',
  },
]

const SCENARIOS = {
  normal: {
    name: '1. Bình thường',
    eyeStatus: 'Mở to',
    mouthStatus: 'Bình thường',
    direction: 'Nhìn thẳng',
    alarm: 'Tắt (An toàn)',
    statusClass: styles.statusNormal,
    statusText: '● AN TOÀN — Tài xế tỉnh táo, tập trung',
    eyeClosed: false,
    mouthYawn: false,
  },
  drowsy: {
    name: '2. Ngủ gật',
    eyeStatus: 'Nhắm nghiền!',
    mouthStatus: 'Bình thường',
    direction: 'Gục đầu',
    alarm: 'HÚ CÒI BÁO ĐỘNG!',
    statusClass: styles.statusDanger,
    statusText: '⚡ NGUY HIỂM — Tài xế ngủ gật (HÚ CÒI ĐÁNH THỨC!)',
    eyeClosed: true,
    mouthYawn: false,
  },
  yawn: {
    name: '3. Ngáp mệt mỏi',
    eyeStatus: 'Mắt lờ đờ',
    mouthStatus: 'Đang ngáp to',
    direction: 'Nhìn thẳng',
    alarm: 'Nhắc nghỉ trạm',
    statusClass: styles.statusWarning,
    statusText: '▲ CẢNH BÁO — Mệt mỏi (Nhắc tài xế nghỉ ngơi)',
    eyeClosed: false,
    mouthYawn: true,
  },
  distracted: {
    name: '4. Quay đầu',
    eyeStatus: 'Nhìn lệch hướng',
    mouthStatus: 'Bình thường',
    direction: 'Lệch hướng (>25°)',
    alarm: 'Nhắc nhìn đường',
    statusClass: styles.statusWarning,
    statusText: '▲ CẢNH BÁO — Mất tập trung (Nhắc nhìn thẳng đường)',
    eyeClosed: false,
    mouthYawn: false,
  },
}

// Single Pricing Configuration Constant for easy editing
const PRICING_CONFIG = {
  monthly: {
    freePrice: '0đ',
    freePeriod: 'trọn đời',
    proPrice: '299.000đ',
    proPeriod: 'xe / tháng',
  },
  yearly: {
    freePrice: '0đ',
    freePeriod: 'trọn đời',
    proPrice: '239.000đ', // 20% discount
    proPeriod: 'xe / tháng (tiết kiệm 20%)',
  },
}

// Feature Comparison Rows (EXACTLY 2 PLANS, NO "Dashboard Admin" row)
const COMPARISON_ROWS = [
  { label: 'Dành cho', free: 'Tài xế cá nhân, dùng thử', pro: 'Đội xe nhỏ và vừa' },
  { label: 'Số xe tối đa', free: '1 xe', pro: 'Đến 50 xe' },
  { label: 'Phát hiện ngủ gật, ngáp, quay đầu', free: true, pro: true },
  { label: 'Còi cảnh báo trong cabin', free: true, pro: true },
  { label: 'Trang tài xế (Overview, Camera, History)', free: true, pro: true },
  { label: 'Lịch sử chuyến đi', free: '7 ngày', pro: '12 tháng' },
  { label: 'Camera mọi tài xế (Camera Wall)', free: false, pro: true },
  { label: 'Quản lý tổ chức & nhân viên', free: false, pro: true },
  { label: 'Quản lý & điều phối xe', free: false, pro: true },
  { label: 'Bản đồ đội xe trực tiếp', free: false, pro: true },
  { label: 'Gemini Fleet Copilot', free: '5 câu hỏi mỗi ngày', pro: 'Không giới hạn' },
  { label: 'Báo cáo và xuất dữ liệu', free: false, pro: 'PDF, CSV' },
  { label: 'Phân tích cảm xúc, road rage', free: false, pro: true },
  { label: 'Hỗ trợ kỹ thuật', free: 'Cộng đồng', pro: 'Email, 24 giờ' },
]

const ARCHITECTURE_LAYERS = [
  {
    icon: Cpu,
    title: 'Camera AI Tại Xe',
    badge: 'Xử lý tức thì',
    desc: 'Xử lý trực tiếp trên thiết bị, hú còi tức thì mà không lo mất mạng.',
  },
  {
    icon: Radio,
    title: 'Tiết Kiệm 4G/5G',
    badge: 'Tối ưu mạng',
    desc: 'Chỉ gửi dữ liệu sự cố quan trọng, tiết kiệm tối đa dung lượng 4G của xe.',
  },
  {
    icon: Database,
    title: 'Lưu Trữ Hành Trình',
    badge: 'Minh bạch',
    desc: 'Lưu trữ lịch sử chuyến đi và điểm an toàn, dễ dàng tra cứu đối soát.',
  },
  {
    icon: Bot,
    title: 'Trợ Lý Đội Xe',
    badge: 'Báo cáo tự động',
    desc: 'Tự động phân tích vi phạm, gợi ý giải pháp giúp giảm chi phí và tai nạn.',
  },
]

function renderCellContent(value, isPro = false) {
  if (value === true) {
    return (
      <span className={styles.badgeYes}>
        <Check size={14} strokeWidth={2.5} />
        <span>Có</span>
      </span>
    )
  }
  if (value === false) {
    return (
      <span className={styles.badgeNo}>
        <X size={14} strokeWidth={2} />
        <span>Không</span>
      </span>
    )
  }
  return (
    <span className={`${styles.cellText} ${isPro ? styles.cellTextHighlight : ''}`}>
      {value}
    </span>
  )
}

export default function HomePage() {
  const [activeScenario, setActiveScenario] = useState('normal')
  const [billingCycle, setBillingCycle] = useState('monthly') // 'monthly' | 'yearly'
  const navigate = useNavigate()
  const current = SCENARIOS[activeScenario]

  const pricing = PRICING_CONFIG[billingCycle]

  return (
    <div className={styles.page}>
      <Navbar />

      <main>
        {/* ── 1. Hero Section with Video ── */}
        <HeroSection />

        {/* ── 2. Features Bento Grid ── */}
        <section id="features" className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionPill}>
              <Zap size={14} />
              <span>Tính Năng An Toàn AI</span>
            </div>
            <h2 className={styles.sectionTitle}>
              Chủ Động Bảo Vệ <span>Từng Chuyến Đi</span>
            </h2>
            <p className={styles.sectionSubtitle}>
              Tự động quan sát và hú còi cảnh báo ngay khi phát hiện nguy cơ mệt mỏi và lơ đãng.
            </p>
          </div>

          <div className={styles.featuresGrid}>
            {FEATURES.map((item, idx) => {
              const Icon = item.icon
              return (
                <div key={idx} className={styles.featureCard}>
                  <div className={styles.featureIconBox}>
                    <Icon size={24} strokeWidth={2.2} />
                  </div>
                  <h3 className={styles.featureTitle}>{item.title}</h3>
                  <p className={styles.featureDesc}>{item.desc}</p>
                  <div className={styles.featureBadge}>
                    <Sparkles size={12} />
                    <span>{item.badge}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── 3. Interactive Cockpit Simulator ── */}
        <section id="demo" className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={`${styles.sectionPill} ${styles.sectionPillAmber}`}>
              <ShieldCheck size={14} />
              <span>Trải Nghiệm Trực Quan</span>
            </div>
            <h2 className={styles.sectionTitle}>
              Xem Cách Xe <span>Tự Động Báo Động</span>
            </h2>
            <p className={styles.sectionSubtitle}>
              Bấm chọn từng tình huống để xem camera nhận biết và xử lý tức thì.
            </p>
          </div>

          <div className={styles.demoWrapper}>
            <div className={styles.simLayout}>
              {/* Simulator HUD Display */}
              <div className={styles.simCockpit}>
                <div className={styles.simHudHeader}>
                  <div className={styles.simRecDot}>CAMERA ĐANG QUAN SÁT</div>
                  <div className={`${styles.simStatusBadge} ${current.statusClass}`}>
                    {current.statusText}
                  </div>
                </div>

                {/* Face Mesh Wireframe Simulation */}
                <div className={styles.simMeshMock}>
                  <div
                    className={styles.simMeshFace}
                    style={{
                      transform:
                        activeScenario === 'distracted'
                          ? 'rotateY(30deg) translateX(24px)'
                          : activeScenario === 'drowsy'
                          ? 'translateY(16px) rotateX(15deg)'
                          : 'none',
                    }}
                  >
                    <div className={styles.simMeshEyes}>
                      <div className={`${styles.simEye} ${current.eyeClosed ? styles.simEyeClosed : ''}`} />
                      <div className={`${styles.simEye} ${current.eyeClosed ? styles.simEyeClosed : ''}`} />
                    </div>
                    <div className={`${styles.simMouth} ${current.mouthYawn ? styles.simMouthYawn : ''}`} />
                  </div>
                </div>

                {/* Telemetry Readout */}
                <div className={styles.simHudFooter}>
                  <div className={styles.simFooterItem}>
                    <span className={styles.simFooterLabel}>Mắt (EAR)</span>
                    <span className={styles.simFooterVal}>{current.eyeStatus}</span>
                  </div>
                  <div className={styles.simFooterItem}>
                    <span className={styles.simFooterLabel}>Miệng (MAR)</span>
                    <span className={styles.simFooterVal}>{current.mouthStatus}</span>
                  </div>
                  <div className={styles.simFooterItem}>
                    <span className={styles.simFooterLabel}>Hướng nhìn</span>
                    <span className={styles.simFooterVal}>{current.direction}</span>
                  </div>
                  <div className={styles.simFooterItem}>
                    <span className={styles.simFooterLabel}>Còi xe</span>
                    <span
                      className={styles.simFooterVal}
                      style={{ color: current.alarm.includes('HÚ') ? '#EF4444' : '#10B981' }}
                    >
                      {current.alarm}
                    </span>
                  </div>
                </div>
              </div>

              {/* Controls Column */}
              <div className={styles.simControls}>
                <h3 className={styles.simControlHeading}>Thử Tình Huống Giả Lập</h3>
                <p className={styles.simControlDesc}>
                  Camera liên tục theo dõi gương mặt tài xế và hú còi ngay khi nhận thấy nguy hiểm.
                </p>

                <div className={styles.scenarioButtons}>
                  {Object.entries(SCENARIOS).map(([key, sc]) => (
                    <button
                      key={key}
                      className={`${styles.scenarioBtn} ${activeScenario === key ? styles.scenarioBtnActive : ''}`}
                      onClick={() => setActiveScenario(key)}
                    >
                      <CheckCircle2 size={16} />
                      <span>{sc.name}</span>
                    </button>
                  ))}
                </div>

                {/* CTA pointing to Real Camera */}
                <button
                  className={styles.simLiveCta}
                  onClick={() => navigate('/driver/camera')}
                >
                  <span>Mở Buồng Lái Với Camera Thật</span>
                  <ArrowRight size={17} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── 4. Pricing & Plans Section ── */}
        <section id="pricing" className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={`${styles.sectionPill} ${styles.sectionPillAmber}`}>
              <CreditCard size={14} />
              <span>Bảng Giá Minh Bạch</span>
            </div>
            <h2 className={styles.sectionTitle}>
              Chọn Gói Phù Hợp <span>Với Nhu Cầu Của Bạn</span>
            </h2>
            <p className={styles.sectionSubtitle}>
              Bắt đầu miễn phí cho tài xế cá nhân hoặc nâng cấp gói chuyên nghiệp để trang bị toàn diện cho đội xe.
            </p>
          </div>

          {/* Monthly / Yearly Billing Toggle */}
          <div className={styles.billingToggle}>
            <div className={styles.toggleContainer}>
              <button
                className={`${styles.toggleBtn} ${billingCycle === 'monthly' ? styles.toggleBtnActive : ''}`}
                onClick={() => setBillingCycle('monthly')}
              >
                Thanh Toán Hàng Tháng
              </button>
              <button
                className={`${styles.toggleBtn} ${billingCycle === 'yearly' ? styles.toggleBtnActive : ''}`}
                onClick={() => setBillingCycle('yearly')}
              >
                <span>Hàng Năm</span>
                <span className={styles.discountBadge}>-20%</span>
              </button>
            </div>
          </div>

          {/* Pricing Cards: Exactly 2 plans */}
          <div className={styles.pricingCards}>
            {/* Free Plan */}
            <div className={styles.pricingCard}>
              <div className={styles.planHeader}>
                <div className={styles.planName}>
                  <span>Miễn phí</span>
                </div>
                <div className={styles.planTargetPill}>
                  <User size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: -1 }} />
                  <span>Tài xế cá nhân</span>
                </div>
              </div>

              <p className={styles.planDesc}>
                Phù hợp cho bác tài cá nhân cần một trợ lý cảnh báo an toàn thông minh tức thì trong cabin.
              </p>

              <div className={styles.planPriceWrapper}>
                <span className={styles.planPrice}>{pricing.freePrice}</span>
                <span className={styles.planPricePeriod}>/ {pricing.freePeriod}</span>
              </div>

              <ul className={styles.planFeatures}>
                <li className={styles.planFeatureItem}>
                  <CheckCircle2 size={18} className={styles.planFeatureIcon} />
                  <span>1 xe cá nhân</span>
                </li>
                <li className={styles.planFeatureItem}>
                  <CheckCircle2 size={18} className={styles.planFeatureIcon} />
                  <span>Phát hiện ngủ gật, ngáp, quay đầu</span>
                </li>
                <li className={styles.planFeatureItem}>
                  <CheckCircle2 size={18} className={styles.planFeatureIcon} />
                  <span>Còi cảnh báo trong cabin tức thì</span>
                </li>
                <li className={styles.planFeatureItem}>
                  <CheckCircle2 size={18} className={styles.planFeatureIcon} />
                  <span>Trang tài xế (Overview, Camera, History)</span>
                </li>
                <li className={styles.planFeatureItem}>
                  <CheckCircle2 size={18} className={styles.planFeatureIcon} />
                  <span>Lịch sử chuyến đi 7 ngày</span>
                </li>
                <li className={styles.planFeatureItem}>
                  <CheckCircle2 size={18} className={styles.planFeatureIcon} />
                  <span>Trợ lý AI: 5 câu hỏi/ngày</span>
                </li>
                <li className={styles.planFeatureItem}>
                  <CheckCircle2 size={18} className={styles.planFeatureIcon} />
                  <span>Hỗ trợ qua cộng đồng</span>
                </li>
              </ul>

              <Link to="/register" className={`${styles.planBtn} ${styles.planBtnDefault}`}>
                <span>Bắt đầu miễn phí</span>
                <ArrowRight size={16} />
              </Link>
            </div>

            {/* Pro Plan */}
            <div className={`${styles.pricingCard} ${styles.pricingCardPopular}`}>
              <div className={styles.popularBadge}>
                ★ Phổ Biến Nhất · Đội Xe
              </div>

              <div className={styles.planHeader}>
                <div className={styles.planName}>
                  <span>Chuyên nghiệp</span>
                </div>
                <div className={`${styles.planTargetPill} ${styles.planTargetPillPro}`}>
                  <Building2 size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: -1 }} />
                  <span>Đội xe & Doanh nghiệp</span>
                </div>
              </div>

              <p className={styles.planDesc}>
                Giải pháp toàn diện cho chủ xe và doanh nghiệp vận tải cần quản lý tập trung và phân tích an toàn.
              </p>

              <div className={styles.planPriceWrapper}>
                <span className={styles.planPrice}>{pricing.proPrice}</span>
                <span className={styles.planPricePeriod}>/ {pricing.proPeriod}</span>
              </div>

              <ul className={styles.planFeatures}>
                <li className={styles.planFeatureItem}>
                  <CheckCircle2 size={18} className={styles.planFeatureIcon} />
                  <span>Tất cả quyền lợi của gói Miễn phí</span>
                </li>
                <li className={styles.planFeatureItem}>
                  <CheckCircle2 size={18} className={styles.planFeatureIcon} />
                  <span>Tạo tổ chức & quản lý nhân viên</span>
                </li>
                <li className={styles.planFeatureItem}>
                  <CheckCircle2 size={18} className={styles.planFeatureIcon} />
                  <span>Camera mọi tài xế (Camera Wall thời gian thực)</span>
                </li>
                <li className={styles.planFeatureItem}>
                  <CheckCircle2 size={18} className={styles.planFeatureIcon} />
                  <span>Quản lý & phân phối xe (Đến 50 xe)</span>
                </li>
                <li className={styles.planFeatureItem}>
                  <CheckCircle2 size={18} className={styles.planFeatureIcon} />
                  <span>Lịch sử hành trình & sự cố 12 tháng</span>
                </li>
                <li className={styles.planFeatureItem}>
                  <CheckCircle2 size={18} className={styles.planFeatureIcon} />
                  <span>Báo cáo & xuất dữ liệu (PDF, CSV)</span>
                </li>
                <li className={styles.planFeatureItem}>
                  <CheckCircle2 size={18} className={styles.planFeatureIcon} />
                  <span>Phân tích cảm xúc & Road Rage</span>
                </li>
                <li className={styles.planFeatureItem}>
                  <CheckCircle2 size={18} className={styles.planFeatureIcon} />
                  <span>Trợ lý AI không giới hạn</span>
                </li>
                <li className={styles.planFeatureItem}>
                  <CheckCircle2 size={18} className={styles.planFeatureIcon} />
                  <span>Hỗ trợ kỹ thuật ưu tiên qua Email (24 giờ)</span>
                </li>
              </ul>

              <Link to="/register" className={`${styles.planBtn} ${styles.planBtnPrimary}`}>
                <span>Dùng thử 14 ngày</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          {/* Detailed Feature Comparison Table (No 'Dashboard Admin' row) */}
          <div className={styles.comparisonSection}>
            <div className={styles.comparisonHeader}>
              <h3 className={styles.comparisonTitle}>Bảng So Sánh Chi Tiết Quyền Lợi</h3>
              <p className={styles.comparisonSubtitle}>
                Chi tiết từng tiêu chí và tính năng tương ứng theo từng gói dịch vụ FleetGuard
              </p>
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.compareTable}>
                <thead>
                  <tr>
                    <th className={styles.featureCol}>Tiêu chí so sánh</th>
                    <th className={styles.freeCol}>Miễn phí</th>
                    <th className={`${styles.proCol} ${styles.thPro}`}>Chuyên nghiệp</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row, idx) => (
                    <tr key={idx}>
                      <td className={styles.featureCol}>{row.label}</td>
                      <td className={styles.freeCol}>{renderCellContent(row.free, false)}</td>
                      <td className={`${styles.proCol} ${styles.tdPro}`}>{renderCellContent(row.pro, true)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── 5. Architecture & SLA Banner (#about) ── */}
        <section id="about" className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionPill}>
              <Layers size={14} />
              <span>Nền Tảng Vận Hành</span>
            </div>
            <h2 className={styles.sectionTitle}>
              Thiết Kế Cho <span>Môi Trường Thực Tế</span>
            </h2>
            <p className={styles.sectionSubtitle}>
              Hệ thống vận hành bền bỉ trên mọi nẻo đường, bảo vệ an toàn tối đa cho tài xế và tối ưu chi phí cho chủ xe.
            </p>
          </div>

          {/* 4 Architecture Layer Cards */}
          <div className={styles.archGrid}>
            {ARCHITECTURE_LAYERS.map((layer, idx) => {
              const Icon = layer.icon
              return (
                <div key={idx} className={styles.archCard}>
                  <div className={styles.archIconBox}>
                    <Icon size={26} strokeWidth={2.2} />
                  </div>
                  <h3 className={styles.archTitle}>{layer.title}</h3>
                  <span className={styles.archBadge}>{layer.badge}</span>
                  <p className={styles.archDesc}>{layer.desc}</p>
                </div>
              )
            })}
          </div>

          {/* SLA Banner */}
          <div className={styles.slaBanner}>
            <div className={styles.slaItem}>
              <span className={styles.slaValue}>&lt; 50ms</span>
              <span className={styles.slaLabel}>Tốc Độ Báo Động</span>
              <span className={styles.slaSub}>Hú còi tức thì khi buồn ngủ</span>
            </div>

            <div className={styles.slaItem}>
              <span className={styles.slaValue}>99.8%</span>
              <span className={styles.slaLabel}>Hoạt Động Bền Bỉ</span>
              <span className={styles.slaSub}>Sẵn sàng phục vụ 24/7</span>
            </div>

            <div className={styles.slaItem}>
              <span className={styles.slaValue}>Cực nhẹ</span>
              <span className={styles.slaLabel}>Tiết Kiệm 4G/5G</span>
              <span className={styles.slaSub}>Chỉ tốn vài MB mỗi chuyến đi</span>
            </div>

            <div className={styles.slaItem}>
              <span className={styles.slaValue}>100%</span>
              <span className={styles.slaLabel}>Báo Động Mất Sóng</span>
              <span className={styles.slaSub}>Mất mạng vẫn hú còi bình thường</span>
            </div>
          </div>
        </section>
      </main>

      {/* ── 6. Enterprise Footer ── */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerTop}>
            <div className={styles.footerBrand}>
              <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <SamsaraLogo size={28} color="#0F172A" accentColor="#F59E0B" />
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>
                  Fleet<span style={{ color: '#F59E0B' }}>Guard</span>
                </span>
              </Link>
              <p className={styles.footerBrandText}>
                Hệ thống camera thông minh bảo vệ tài xế, tự động cảnh báo ngủ gật và mất tập trung khi lái xe.
              </p>
            </div>

            <div className={styles.footerCol}>
              <h4>Tính Năng An Toàn</h4>
              <ul>
                <li><a href="#features">Phát hiện ngủ gật (EAR)</a></li>
                <li><a href="#features">Cảnh báo ngáp ngủ (MAR)</a></li>
                <li><a href="#features">Chống xem điện thoại (Yaw)</a></li>
                <li><a href="#features">Còi hú buồng lái HUD</a></li>
              </ul>
            </div>

            <div className={styles.footerCol}>
              <h4>Tài Khoản</h4>
              <ul>
                <li><Link to="/login">Đăng Nhập</Link></li>
                <li><Link to="/register">Đăng Ký</Link></li>
                <li><a href="#pricing">Bảng Giá Dịch Vụ</a></li>
                <li><a href="#demo">Mô Phỏng Thực Tế</a></li>
                <li><a href="#features">Tính Năng Chính</a></li>
              </ul>
            </div>

            <div className={styles.footerCol}>
              <h4>Hỗ Trợ & Tài Liệu</h4>
              <ul>
                <li><a href="#about">Kiến trúc hệ thống</a></li>
                <li><a href="#about">Cam kết SLA dịch vụ</a></li>
                <li><a href="tel:19001234">Hotline: 1900 1234</a></li>
                <li><a href="mailto:support@fleetguard.vn">Email: support@fleetguard.vn</a></li>
              </ul>
            </div>
          </div>

          <div className={styles.footerBottom}>
            <div>© 2026 FleetGuard · Driver Safety System. All rights reserved.</div>
            <div className={styles.systemStatus}>
              <span className={styles.statusDot} />
              <span>Hệ thống hoạt động bình thường</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
