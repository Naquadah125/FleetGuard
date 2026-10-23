import { useEffect, useMemo, useState } from 'react'
import { Bot, Download, Plus, Send, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import styles from './AdminChat.module.css'

const starterPrompts = [
  'Tổng quan an toàn đội xe trong 7 ngày gần đây',
  'Thống kê cảm xúc của đội xe',
  'Có cảnh báo nguy hiểm nào cần chú ý không?',
]

function createSessionId(userId) {
  return `admin_chat_${userId || 'admin'}_${Date.now()}`
}

function downloadFile(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  anchor.click()
  URL.revokeObjectURL(url)
}

function exportCsv(result) {
  const rows = result.driverRanking || Object.entries(result.emotionDistribution || {}).map(([emotion, count]) => ({ emotion, count }))
  const headers = Object.keys(rows[0] || {})
  const csv = [headers.join(','), ...rows.map((row) => headers.map((header) => JSON.stringify(row[header] ?? '')).join(','))].join('\n')
  downloadFile('fleetguard-admin-ai.csv', csv, 'text/csv;charset=utf-8')
}

function ResultView({ result }) {
  if (!result) return <div className={styles.dataEmpty}>Kết quả phân tích sẽ xuất hiện ở đây.</div>
  const emotionRows = Object.entries(result.emotionDistribution || {})
  return (
    <div className={styles.result}>
      <h3>{result.title}</h3>
      <div className={styles.dataLine}><span>Khoảng thời gian</span><strong>{result.period?.source || 'Không rõ'}</strong></div>
      <div className={styles.dataLine}><span>Bản ghi phiên lái</span><strong>{result.recordsUsed?.sessions ?? 0}</strong></div>
      <div className={styles.dataLine}><span>Bản ghi cảm xúc</span><strong>{result.recordsUsed?.emotionLogs ?? 0}</strong></div>
      {result.metrics && Object.entries(result.metrics).map(([key, value]) => (
        <div className={styles.dataLine} key={key}><span>{key}</span><strong>{value}</strong></div>
      ))}
      {typeof result.criticalAlerts === 'number' && <div className={styles.dataLine}><span>Cảnh báo nguy hiểm</span><strong>{result.criticalAlerts}</strong></div>}
      {typeof result.warningAlerts === 'number' && <div className={styles.dataLine}><span>Cảnh báo mức 1</span><strong>{result.warningAlerts}</strong></div>}
      {emotionRows.map(([emotion, count]) => (
        <div className={styles.dataLine} key={emotion}><span>{emotion}</span><strong>{count}</strong></div>
      ))}
      {(result.driverRanking || []).map((driver) => (
        <div className={styles.dataLine} key={driver.driverId}>
          <Link to="/admin/employees">{driver.name}</Link>
          <strong>{driver.safetyScore ?? driver.alerts}</strong>
        </div>
      ))}
      {result.disclaimer && <p className={styles.disclaimer}>{result.disclaimer}</p>}
    </div>
  )
}

export default function AdminChat() {
  const { user, token } = useAuth()
  const userId = user?.id || user?._id || 'admin'
  const storageKey = `fleetguard_admin_chat_session_${userId}`
  const [sessionId, setSessionId] = useState(() => localStorage.getItem(storageKey) || createSessionId(userId))
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const latestResult = useMemo(() => [...messages].reverse().find((item) => item.structured_data)?.structured_data, [messages])
  const latestModelMessage = useMemo(() => [...messages].reverse().find((item) => item.role === 'model'), [messages])
  const latestUserMessage = useMemo(() => [...messages].reverse().find((item) => item.role === 'user'), [messages])

  useEffect(() => { localStorage.setItem(storageKey, sessionId) }, [sessionId, storageKey])
  useEffect(() => {
    let cancelled = false
    fetch(`/api/analytics/chatbot/sessions/${sessionId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (!cancelled && data?.messages) setMessages(data.messages) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [sessionId, token])

  const startNewSession = () => { setSessionId(createSessionId(userId)); setMessages([]); setDraft(''); setError('') }
  const sendMessage = async (event, messageOverride) => {
    event?.preventDefault()
    const message = (messageOverride || draft).trim()
    if (!message || loading) return
    setMessages((current) => [...current, { role: 'user', message, timestamp: new Date().toISOString() }])
    setDraft(''); setLoading(true); setError('')
    try {
      const response = await fetch('/api/analytics/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ session_id: sessionId, message }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.message || 'Không thể lấy phân tích Admin AI.')
      setMessages((current) => [...current, { role: 'model', message: data.reply, structured_data: data.structuredData, modelStatus: data.modelStatus, timestamp: data.timestamp }])
    } catch (sendError) { setError(sendError.message) } finally { setLoading(false) }
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div><div className={styles.titleRow}><Bot size={22} aria-hidden="true" /><h1>Trợ lý AI vận hành</h1></div><p>Phân tích dữ liệu an toàn của riêng tổ chức này, không dùng dữ liệu demo.</p></div>
        <button type="button" className={styles.newSessionButton} onClick={startNewSession}><Plus size={17} /> Tạo session mới</button>
      </header>
      <div className={styles.layout}>
        <div className={styles.chatPanel}>
          <div className={styles.messages} aria-live="polite">
            {!messages.length && <div className={styles.emptyState}><Sparkles size={28} /><h2>Hỏi về vận hành đội xe</h2><p>Chọn một câu hỏi hoặc nhập yêu cầu phân tích.</p><div className={styles.promptList}>{starterPrompts.map((prompt) => <button key={prompt} type="button" onClick={() => sendMessage(null, prompt)}>{prompt}</button>)}</div></div>}
            {messages.map((item, index) => <article className={`${styles.message} ${item.role === 'user' ? styles.userMessage : styles.modelMessage}`} key={`${item.timestamp || 'message'}-${index}`}><strong>{item.role === 'user' ? 'Bạn' : 'FleetGuard AI'}</strong><p>{item.message}</p></article>)}
            {loading && <article className={`${styles.message} ${styles.modelMessage}`}><strong>FleetGuard AI</strong><p>Đang tổng hợp dữ liệu tổ chức...</p></article>}
          </div>
          {error && <div className={styles.error} role="alert">{error}</div>}
          <form className={styles.composer} onSubmit={sendMessage}><label htmlFor="admin-chat-message">Câu hỏi vận hành</label><div className={styles.inputRow}><textarea id="admin-chat-message" value={draft} onChange={(event) => setDraft(event.target.value)} rows={2} disabled={loading} placeholder="Ví dụ: Thống kê cảnh báo nguy hiểm trong tuần này" /><button type="submit" aria-label="Gửi câu hỏi" disabled={loading || !draft.trim()}><Send size={18} /></button></div></form>
        </div>
        <aside className={styles.dataPanel}><h2>Dữ liệu trả về</h2><p>Số liệu nội bộ là nguồn chính để bảo đảm đúng phạm vi tổ chức.</p><ResultView result={latestResult} />{latestResult && <><div className={styles.exportRow}><button type="button" onClick={() => downloadFile('fleetguard-admin-ai.json', JSON.stringify(latestResult, null, 2), 'application/json')}><Download size={13} /> JSON</button><button type="button" onClick={() => exportCsv(latestResult)}>CSV</button></div><details className={styles.explanation}><summary>Xem cách phân tích</summary><p>Nguồn: {latestResult.source}; loại kết quả: {latestResult.type}; đã đọc {latestResult.recordsUsed?.sessions ?? 0} phiên lái.</p><p>Model đã thử: {latestModelMessage?.modelStatus?.attemptedModels?.join(', ') || 'Không dùng Gemini'}{latestModelMessage?.modelStatus?.selectedModel ? `; đang dùng: ${latestModelMessage.modelStatus.selectedModel}` : ''}.</p><p>Tool: resolve_admin_analytics. Cảm xúc là tín hiệu dự đoán, không phải kết luận tâm lý.</p></details>{latestModelMessage?.modelStatus?.failureCode && <button type="button" className={styles.newSessionButton} onClick={() => sendMessage(null, latestUserMessage?.message)}>Thử lại Gemini</button>}</>}</aside>
      </div>
    </section>
  )
}
