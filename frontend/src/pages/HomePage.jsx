import { useState } from 'react'
import { Link } from 'react-router-dom'
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
} from 'lucide-react'
import Navbar from '../components/Navbar'
import HeroSection from '../components/HeroSection'
import styles from './HomePage.module.css'

const FEATURES = [
  {
    icon: Eye,
    title: 'Báo Động Ngủ Gật',
    desc: 'Hú còi ngay giây đầu tiên khi mắt vừa khép lại để đánh thức tài xế tức thì.',
    badge: '< 0.1s phản ứng',
  },
  {
    icon: AlertTriangle,
    title: 'Nhắc Nhở Ngáp Ngủ',
    desc: 'Nhận diện tài xế đuối sức, phát cảnh báo khuyên dừng xe nghỉ ngơi.',
    badge: 'Ngừa rủi ro sớm',
  },
  {
    icon: Smartphone,
    title: 'Cảnh Báo Dùng Điện Thoại',
    desc: 'Nhắc nhở ngay khi tài xế cúi nhìn màn hình hoặc ngoái đầu quá 2 giây.',
    badge: 'Chống lơ đãng',
  },
  {
    icon: Smile,
    title: 'Kiểm Soát Căng Thẳng',
    desc: 'Nhắc nhở giữ bình tĩnh khi gặp kẹt xe, tránh bức xúc lái xe nguy hiểm.',
    badge: 'Lái xe điềm đạm',
  },
  {
    icon: Volume2,
    title: 'Còi Hú To Trong Xe',
    desc: 'Âm thanh vang to rõ ràng, đánh thức nhanh kể cả khi xe đang mở nhạc.',
    badge: 'Vang rõ trong cabin',
  },
  {
    icon: Bot,
    title: 'Báo Cáo Cho Chủ Xe',
    desc: 'Xem tình trạng lái xe an toàn của cả đoàn xe trên điện thoại mọi lúc.',
    badge: 'Xem từ xa 24/7',
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
    statusText: '● AN TOÀN',
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
    statusText: '⚡ NGUY HIỂM: NGỦ GẬT (HÚ CÒI!)',
    eyeClosed: true,
    mouthYawn: false,
  },
  yawn: {
    name: '3. Ngáp ngủ',
    eyeStatus: 'Mắt lờ đờ',
    mouthStatus: 'Đang ngáp to',
    direction: 'Nhìn thẳng',
    alarm: 'Nhắc nghỉ trạm',
    statusClass: styles.statusWarning,
    statusText: '▲ CẢNH BÁO: MỆT MỎI (NGHỈ TRẠM)',
    eyeClosed: false,
    mouthYawn: true,
  },
  distracted: {
    name: '4. Xem điện thoại',
    eyeStatus: 'Nhìn xuống',
    mouthStatus: 'Bình thường',
    direction: 'Lệch hướng',
    alarm: 'Nhắc nhìn đường',
    statusClass: styles.statusWarning,
    statusText: '▲ CẢNH BÁO: LƠ ĐÃNG (NHÌN ĐƯỜNG)',
    eyeClosed: false,
    mouthYawn: false,
  },
}

export default function HomePage() {
  const [activeScenario, setActiveScenario] = useState('normal')
  const current = SCENARIOS[activeScenario]

  return (
    <div className={styles.page}>
      <Navbar />

      <main>
        {/* ── 1. Hero Section with Video ── */}
        <HeroSection />

        {/* ── 2. Features Grid ── */}
        <section id="features" className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionPill}>
              <Zap size={14} />
              <span>Tính Năng An Toàn</span>
            </div>
            <h2 className={styles.sectionTitle}>
              Chủ Động Bảo Vệ <span>Từng Chuyến Đi</span>
            </h2>
            <p className={styles.sectionSubtitle}>
              Tự động quan sát và hú còi cảnh báo ngay khi phát hiện nguy cơ.
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

                {/* Plain Language Telemetry Readout */}
                <div className={styles.simHudFooter}>
                  <div className={styles.simFooterItem}>
                    <span className={styles.simFooterLabel}>Mắt</span>
                    <span className={styles.simFooterVal}>{current.eyeStatus}</span>
                  </div>
                  <div className={styles.simFooterItem}>
                    <span className={styles.simFooterLabel}>Miệng</span>
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

                <button
                  className={styles.simLiveCta}
                  onClick={() => {
                    const el = document.querySelector('#features')
                    if (el) el.scrollIntoView({ behavior: 'smooth' })
                  }}
                >
                  <span>Tìm Hiểu Toàn Bộ Tính Năng</span>
                  <ArrowRight size={17} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── 4. 3 Simple Steps ── */}
        <section id="about" className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionPill}>
              <ShieldCheck size={14} />
              <span>Dễ Dàng Trang Bị</span>
            </div>
            <h2 className={styles.sectionTitle}>
              3 Bước Lắp Đặt <span>Cực Kỳ Đơn Giản</span>
            </h2>
            <p className={styles.sectionSubtitle}>
              Không cắt dây, không độ chế. Tương thích mọi dòng xe.
            </p>
          </div>

          <div className={styles.stepsGrid}>
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>1</div>
              <h3 className={styles.stepTitle}>Gắn Lên Kính Lái</h3>
              <p className={styles.stepDesc}>
                Hít giác hút lên kính xe và cắm nguồn tẩu sạc 12V/24V trong 2 phút.
              </p>
            </div>

            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>2</div>
              <h3 className={styles.stepTitle}>Tự Động Canh Chừng</h3>
              <p className={styles.stepDesc}>
                Nổ máy là camera tự bật, tự quan sát và hú còi bảo vệ suốt hành trình.
              </p>
            </div>

            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>3</div>
              <h3 className={styles.stepTitle}>Xem Báo Cáo Từ Xa</h3>
              <p className={styles.stepDesc}>
                Chủ xe theo dõi an toàn của từng xe ngay trên điện thoại mọi lúc mọi nơi.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* ── 5. Enterprise Footer ── */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerTop}>
            <div className={styles.footerBrand}>
              <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg width="28" height="28" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M100 10 L175 45 L175 110 Q175 155 100 185 Q25 155 25 110 L25 45 Z" fill="#F59E0B" opacity="0.15" />
                  <path d="M100 10 L175 45 L175 110 Q175 155 100 185 Q25 155 25 110 L25 45 Z" stroke="#F59E0B" strokeWidth="8" fill="none" />
                  <circle cx="100" cy="105" r="30" fill="#F59E0B" />
                  <circle cx="100" cy="105" r="16" fill="#0F172A" />
                  <circle cx="100" cy="105" r="7" fill="#F59E0B" />
                </svg>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: '#0F172A' }}>
                  Fleet<span style={{ color: '#D97706' }}>Guard</span>
                </span>
              </Link>
              <p className={styles.footerBrandText}>
                Hệ thống camera thông minh bảo vệ tài xế, tự động cảnh báo ngủ gật và mất tập trung khi lái xe.
              </p>
            </div>

            <div className={styles.footerCol}>
              <h4>Tính Năng An Toàn</h4>
              <ul>
                <li><a href="#features">Báo động ngủ gật</a></li>
                <li><a href="#features">Nhắc nhở ngáp ngủ</a></li>
                <li><a href="#features">Chống xem điện thoại</a></li>
                <li><a href="#features">Còi hú buồng lái</a></li>
              </ul>
            </div>

            <div className={styles.footerCol}>
              <h4>Tài Khoản</h4>
              <ul>
                <li><Link to="/login">Đăng Nhập</Link></li>
                <li><Link to="/register">Đăng Ký</Link></li>
                <li><a href="#demo">Mô Phỏng Thực Tế</a></li>
                <li><a href="#features">Tính Năng Chính</a></li>
              </ul>
            </div>

            <div className={styles.footerCol}>
              <h4>Hỗ Trợ</h4>
              <ul>
                <li><a href="#about">Hướng dẫn lắp đặt</a></li>
                <li><a href="#demo">Thử nghiệm thực tế</a></li>
                <li><a href="tel:19001234">Hotline: 1900 1234</a></li>
                <li><a href="mailto:support@fleetguard.vn">Email hỗ trợ</a></li>
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
