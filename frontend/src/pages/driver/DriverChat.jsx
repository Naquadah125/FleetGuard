import { useEffect, useMemo, useState } from 'react'
import { Bot, Plus, Send, Sparkles } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import ChatMessageContent from '../../components/common/ChatMessageContent'
import styles from './DriverChat.module.css'

const starterPrompts = [
  'Thống kê các cảm xúc của tôi trong 7 ngày gần đây',
  'Có cảm xúc giận dữ nào được ghi nhận không?',
  'Giải thích cách FleetGuard trả về dữ liệu cảm xúc',
]

function createSessionId(userId) {
  return `chat_${userId || 'driver'}_${Date.now()}`
}

export default function DriverChat() {
  const { user, token } = useAuth()
  const userId = user?.id || user?._id || 'driver'
  const storageKey = `fleetguard_chat_session_${userId}`
  const [sessionId, setSessionId] = useState(() => (
    localStorage.getItem(storageKey) || createSessionId(userId)
  ))
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    localStorage.setItem(storageKey, sessionId)
  }, [sessionId, storageKey])

  useEffect(() => {
    let cancelled = false
    async function loadSession() {
      try {
        const response = await fetch(`/api/analytics/chatbot/sessions/${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!response.ok) return
        const data = await response.json()
        if (!cancelled && data.messages?.length) setMessages(data.messages)
      } catch {
        // The first message can still explain a connection problem.
      }
    }
    loadSession()
    return () => {
      cancelled = true
    }
  }, [sessionId, token])

  const hasMessages = messages.length > 0
  const structuredResults = useMemo(
    () => messages.filter((message) => message.structured_data).map((message) => message.structured_data),
    [messages],
  )

  const startNewSession = () => {
    setSessionId(createSessionId(userId))
    setMessages([])
    setDraft('')
    setError('')
  }

  const sendMessage = async (event) => {
    event?.preventDefault()
    const message = draft.trim()
    if (!message || loading) return

    setMessages((current) => [...current, {
      role: 'user',
      message,
      timestamp: new Date().toISOString(),
    }])
    setDraft('')
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/analytics/chatbot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ session_id: sessionId, message }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Không thể kết nối với Gemini.')
      }
      setMessages((current) => [...current, {
        role: 'model',
        message: data.reply,
        structured_data: data.structuredData,
        timestamp: data.timestamp,
      }])
    } catch (sendError) {
      setError(sendError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <div className={styles.titleRow}>
            <Bot size={22} aria-hidden="true" />
            <h1>Trợ lý AI FleetGuard</h1>
          </div>
          <p>Gemini đọc dữ liệu an toàn của chính bạn và giải thích bằng ngôn ngữ dễ hiểu.</p>
        </div>
        <button type="button" className={styles.newSessionButton} onClick={startNewSession}>
          <Plus size={17} aria-hidden="true" />
          Tạo session mới
        </button>
      </header>

      <div className={styles.layout}>
        <div className={styles.chatPanel}>
          <div className={styles.messages} aria-live="polite">
            {!hasMessages && (
              <div className={styles.emptyState}>
                <Sparkles size={28} aria-hidden="true" />
                <h2>Bắt đầu với dữ liệu an toàn</h2>
                <p>Hỏi về cảm xúc, khoảng thời gian, video hoặc cách hệ thống trả dữ liệu.</p>
                <div className={styles.promptList}>
                  {starterPrompts.map((prompt) => (
                    <button key={prompt} type="button" onClick={() => setDraft(prompt)}>
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((item, index) => (
              <article
                className={`${styles.message} ${item.role === 'user' ? styles.userMessage : styles.modelMessage}`}
                key={`${item.timestamp || 'message'}-${index}`}
              >
                <strong>{item.role === 'user' ? 'Bạn' : 'FleetGuard AI'}</strong>
                <div className={styles.messageBody}>
                  <ChatMessageContent content={item.message} role={item.role} />
                </div>
              </article>
            ))}
            {loading && <div className={`${styles.message} ${styles.modelMessage}`}><strong>FleetGuard AI</strong><p>Đang hỏi Gemini và đọc dữ liệu...</p></div>}
          </div>

          {error && <div className={styles.error} role="alert">{error}</div>}
          <form className={styles.composer} onSubmit={sendMessage}>
            <label htmlFor="chat-message">Câu hỏi của bạn</label>
            <div className={styles.inputRow}>
              <textarea
                id="chat-message"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Ví dụ: Thống kê cảm xúc giận dữ trong tuần này"
                rows={2}
                disabled={loading}
              />
              <button type="submit" aria-label="Gửi câu hỏi" disabled={loading || !draft.trim()}>
                <Send size={18} aria-hidden="true" />
              </button>
            </div>
          </form>
        </div>

        <aside className={styles.dataPanel}>
          <h2>Dữ liệu trả về</h2>
          <p>Gemini có thể gọi tool thống kê cảm xúc hoặc phân tích video.</p>
          {structuredResults.length === 0 ? (
            <div className={styles.dataEmpty}>Kết quả thống kê sẽ xuất hiện ở đây sau câu trả lời đầu tiên.</div>
          ) : structuredResults.map((result, index) => (
            <div className={styles.result} key={index}>
              <h3>Phân bố cảm xúc</h3>
              {Object.entries(result.emotion_distribution || {}).map(([emotion, value]) => (
                <div className={styles.dataLine} key={emotion}>
                  <span>{emotion}</span>
                  <strong>{value.count} lần · {value.percentage}%</strong>
                </div>
              ))}
            </div>
          ))}
        </aside>
      </div>
    </section>
  )
}
