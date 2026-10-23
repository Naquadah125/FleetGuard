import { useMemo } from 'react'
import { AlertTriangle, AlertCircle, CheckCircle2, Info, Lightbulb } from 'lucide-react'
import styles from './ChatMessageContent.module.css'

/**
 * Render inline markdown text (bold, italic, code)
 */
function renderInline(text) {
  if (!text) return null
  // Match **bold**, *italic*, or `code`
  const tokens = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g)
  return tokens.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return <strong key={index}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return <em key={index}>{part.slice(1, -1)}</em>
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return <code key={index} className={styles.codeInline}>{part.slice(1, -1)}</code>
    }
    return part
  })
}

/**
 * Determine metric severity based on label & value
 */
function getMetricType(label = '', value = '') {
  const normalizedLabel = label.toLowerCase()
  const normalizedVal = String(value).toLowerCase()

  if (
    normalizedLabel.includes('nguy hiểm') ||
    normalizedLabel.includes('critical') ||
    normalizedLabel.includes('tai nạn') ||
    normalizedLabel.includes('vi phạm nghiêm trọng')
  ) {
    return 'danger'
  }

  if (
    normalizedLabel.includes('buồn ngủ') ||
    normalizedLabel.includes('drowsy') ||
    normalizedLabel.includes('ngáp') ||
    normalizedLabel.includes('yawn') ||
    normalizedLabel.includes('mất tập trung') ||
    normalizedLabel.includes('distracted') ||
    normalizedLabel.includes('cảnh báo') ||
    normalizedLabel.includes('mệt mỏi')
  ) {
    // If count is 0, it's safe
    if (normalizedVal.startsWith('0')) return 'success'
    return 'warning'
  }

  if (
    normalizedLabel.includes('an toàn') ||
    normalizedLabel.includes('safety') ||
    normalizedLabel.includes('điểm') ||
    normalizedLabel.includes('score')
  ) {
    const num = parseInt(normalizedVal, 10)
    if (!isNaN(num)) {
      if (num >= 80) return 'success'
      if (num < 60) return 'danger'
      return 'warning'
    }
    return 'success'
  }

  return 'neutral'
}

/**
 * Parse structured message blocks from raw text
 */
function parseMessageBlocks(rawText) {
  if (!rawText) return []

  const lines = rawText.split('\n')
  const blocks = []
  let currentList = null

  const flushList = () => {
    if (currentList && currentList.items.length > 0) {
      blocks.push(currentList)
      currentList = null
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]
    const line = rawLine.trim()

    if (!line) {
      flushList()
      continue
    }

    // Check for bullet list item: * ..., - ..., • ...
    const listMatch = line.match(/^[*•-]\s+(.*)$/)
    if (listMatch) {
      const itemContent = listMatch[1].trim()
      // Check if it's a key-value metric: e.g. **Buồn ngủ (Drowsy):** 2 lần
      const kvMatch = itemContent.match(/^(\*{0,2}(.*?)\*{0,2}):\s*(.*)$/)

      if (!currentList) {
        currentList = { type: 'list', items: [] }
      }

      if (kvMatch) {
        const cleanLabel = kvMatch[2].replace(/\*\*/g, '').trim()
        const cleanValue = kvMatch[3].trim()
        currentList.items.push({
          type: 'metric',
          label: cleanLabel,
          value: cleanValue,
          severity: getMetricType(cleanLabel, cleanValue),
        })
      } else {
        currentList.items.push({
          type: 'bullet',
          text: itemContent,
        })
      }
      continue
    }

    // Not a list item -> flush any open list
    flushList()

    // Check for Callout (Nhận xét, Đánh giá, Lưu ý, Khuyến nghị, Lời khuyên)
    const calloutMatch = line.match(/^(\*{0,2}(Nhận xét|Đánh giá|Lưu ý|Khuyến nghị|Cảnh báo|Lời khuyên)\s*:\*{0,2})\s*(.*)$/i)
    if (calloutMatch) {
      const title = calloutMatch[2].trim()
      const content = calloutMatch[3].trim()
      const isWarning = /cảnh báo|lưu ý/i.test(title)
      const isDanger = /nguy hiểm/i.test(title)

      blocks.push({
        type: 'callout',
        title: `${title}:`,
        content,
        severity: isDanger ? 'danger' : isWarning ? 'warning' : 'info',
      })
      continue
    }

    // Check for blockquote > ...
    if (line.startsWith('>')) {
      blocks.push({
        type: 'callout',
        title: 'Ghi chú:',
        content: line.replace(/^>\s*/, ''),
        severity: 'info',
      })
      continue
    }

    // Check for Headings: #, ##, ###
    const headingMatch = line.match(/^#{1,3}\s+(.*)$/)
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        text: headingMatch[1],
      })
      continue
    }

    // Standard paragraph
    blocks.push({
      type: 'paragraph',
      text: line,
    })
  }

  flushList()
  return blocks
}

export default function ChatMessageContent({ content, role = 'model' }) {
  const blocks = useMemo(() => {
    if (role === 'user') return null
    return parseMessageBlocks(content)
  }, [content, role])

  if (role === 'user') {
    return <p className={styles.userContent}>{content}</p>
  }

  return (
    <div className={styles.container}>
      {blocks.map((block, idx) => {
        if (block.type === 'paragraph') {
          return (
            <p key={idx} className={styles.paragraph}>
              {renderInline(block.text)}
            </p>
          )
        }

        if (block.type === 'heading') {
          return (
            <h4 key={idx} className={styles.heading}>
              {renderInline(block.text)}
            </h4>
          )
        }

        if (block.type === 'list') {
          return (
            <ul key={idx} className={styles.list}>
              {block.items.map((item, itemIdx) => {
                if (item.type === 'metric') {
                  const dotClass =
                    item.severity === 'danger'
                      ? styles.dotDanger
                      : item.severity === 'warning'
                      ? styles.dotWarning
                      : item.severity === 'success'
                      ? styles.dotSuccess
                      : styles.dotNeutral

                  const valClass =
                    item.severity === 'danger'
                      ? styles.metricValueDanger
                      : item.severity === 'warning'
                      ? styles.metricValueWarning
                      : item.severity === 'success'
                      ? styles.metricValueSuccess
                      : ''

                  return (
                    <li key={itemIdx} className={styles.metricItem}>
                      <span className={styles.metricLabel}>
                        <span className={`${styles.indicatorDot} ${dotClass}`} />
                        {item.label}
                      </span>
                      <span className={`${styles.metricValue} ${valClass}`}>
                        {item.value}
                      </span>
                    </li>
                  )
                }

                return (
                  <li key={itemIdx} className={styles.bulletItem}>
                    {renderInline(item.text)}
                  </li>
                )
              })}
            </ul>
          )
        }

        if (block.type === 'callout') {
          const calloutClass =
            block.severity === 'danger'
              ? styles.calloutDanger
              : block.severity === 'warning'
              ? styles.calloutWarning
              : styles.calloutInfo

          const IconComponent =
            block.severity === 'danger'
              ? AlertCircle
              : block.severity === 'warning'
              ? AlertTriangle
              : Lightbulb

          return (
            <div key={idx} className={`${styles.callout} ${calloutClass}`}>
              <IconComponent size={18} className={styles.calloutIcon} />
              <div className={styles.calloutContent}>
                <span className={styles.calloutTitle}>{block.title}</span>
                {renderInline(block.content)}
              </div>
            </div>
          )
        }

        return null
      })}
    </div>
  )
}
