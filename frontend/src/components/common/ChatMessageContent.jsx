import { useMemo } from 'react'
import { AlertTriangle, AlertCircle, CheckCircle2, Info, Lightbulb, Shield, Award, UserCheck } from 'lucide-react'
import styles from './ChatMessageContent.module.css'

/**
 * Remove emoji characters and normalize messy markdown artifacts
 */
function cleanRawText(rawText) {
  if (!rawText) return ''

  // 1. Strip cheap AI emojis (symbols, pictographs, medals, flags, etc.)
  let text = rawText.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27EF}]/gu, '')

  // 2. Completely strip all '**' asterisks
  text = text.replace(/\*\*/g, '')

  // 3. Normalize split lines where a label sits alone and value is on next line
  const lines = text.split('\n')
  const mergedLines = []

  for (let i = 0; i < lines.length; i++) {
    const cur = lines[i].trim()
    const next = lines[i + 1] ? lines[i + 1].trim() : ''

    // If cur is a standalone number like "1." or "2." and next line is content
    if (/^\d+\.$/.test(cur) && next) {
      mergedLines.push(`${cur} ${next}`)
      i++
      continue
    }

    // If cur has no colon, no list prefix, and next line starts with a number or value
    if (
      cur &&
      !cur.startsWith('#') &&
      !cur.startsWith('-') &&
      !cur.startsWith('*') &&
      !cur.startsWith('|') &&
      !cur.endsWith(':') &&
      next &&
      !next.startsWith('#') &&
      !next.startsWith('-') &&
      !next.startsWith('*') &&
      !next.startsWith('|') &&
      /^\d/.test(next)
    ) {
      mergedLines.push(`${cur}: ${next}`)
      i++
      continue
    }

    mergedLines.push(lines[i])
  }

  return mergedLines.join('\n')
}

/**
 * Render inline markdown text (bold, italic, code)
 */
function renderInline(text) {
  if (!text) return null
  // Match `code` or *italic*
  const tokens = text.split(/(`.*?`|\*.*?\*)/g)
  return tokens.map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return <code key={index} className={styles.codeInline}>{part.slice(1, -1)}</code>
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return <em key={index}>{part.slice(1, -1)}</em>
    }
    // Clean any stray asterisks
    return part.replace(/\*/g, '')
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
    if (normalizedVal.startsWith('0')) return 'success'
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
    if (normalizedVal.startsWith('0')) return 'success'
    return 'warning'
  }

  if (
    normalizedLabel.includes('an toàn') ||
    normalizedLabel.includes('safety') ||
    normalizedLabel.includes('điểm') ||
    normalizedLabel.includes('score')
  ) {
    const num = parseFloat(normalizedVal)
    if (!isNaN(num)) {
      if (num >= 90) return 'success'
      if (num < 80) return 'danger'
      return 'warning'
    }
    return 'success'
  }

  return 'neutral'
}

/**
 * Parse driver ranking details:
 * e.g. "Trần Minh Đức: 81.5/100 - 2 phiên lái, 2 cảnh báo"
 * or "Trần Minh Đức: 81.5/100 (2 phiên, 2 cảnh báo)"
 */
function parseDriverRanking(rawText) {
  if (!rawText) return null
  const clean = rawText.replace(/^[-*•\s]+/, '').replace(/\*\*/g, '').trim()
  const rankMatch = clean.match(/^(\d+)\.\s*(.*)$/)
  const rank = rankMatch ? rankMatch[1] : null
  const content = rankMatch ? rankMatch[2] : clean

  // Match: "Tên: Điểm/100 - Chi tiết" or "Tên: Điểm/100 (Chi tiết)" or "Tên: Điểm/100"
  const match = content.match(/^([^:\-()]+?)\s*:\s*(\d+(?:\.\d+)?)\s*(?:\/\s*100|\s*điểm)?(?:\s*(?:[-–]|[(])\s*(.*?)[)]?)?$/i)
  if (!match) return null

  const name = match[1].trim()
  const score = parseFloat(match[2])
  if (isNaN(score) || score < 0 || score > 100) return null

  // Ensure this is a person name, not a generic metric
  if (/điểm|tổng số|trung bình|cảnh báo|focus|tỉ lệ|thời gian|năng suất/i.test(name)) return null

  const details = match[3] ? match[3].replace(/[()]/g, '').trim() : ''
  let sessions = null
  let alerts = null

  if (details) {
    const sMatch = details.match(/(\d+)\s*(?:phiên|chuyến|session)/i)
    if (sMatch) sessions = parseInt(sMatch[1], 10)
    const aMatch = details.match(/(\d+)\s*(?:cảnh báo|alert)/i)
    if (aMatch) alerts = parseInt(aMatch[1], 10)
  }

  return {
    rank,
    name,
    score,
    details,
    sessions,
    alerts,
  }
}

/**
 * Check if a string is a markdown table separator line like |:---:|---|
 */
function isTableSeparator(line) {
  return /^\|[\s:?-]+(\|[\s:?-]+)+\|?$/.test(line.trim())
}

/**
 * Parse structured message blocks from raw text
 */
function parseMessageBlocks(rawText) {
  if (!rawText) return []

  const cleaned = cleanRawText(rawText)
  const lines = cleaned.split('\n')
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

    // Markdown horizontal rule: ---, ***
    if (/^[-*_]{3,}$/.test(line)) {
      flushList()
      continue
    }

    // Check for Markdown table: starts and contains pipe '|'
    if (line.startsWith('|') && line.includes('|', 1)) {
      flushList()
      const tableLines = [line]
      while (i + 1 < lines.length && lines[i + 1].trim().startsWith('|')) {
        i++
        tableLines.push(lines[i].trim())
      }

      // Filter out separator rows and parse headers and rows
      const cleanRows = tableLines
        .filter((l) => !isTableSeparator(l))
        .map((l) =>
          l
            .replace(/^\|/, '')
            .replace(/\|$/, '')
            .split('|')
            .map((c) => c.trim())
        )

      if (cleanRows.length > 1) {
        const headers = cleanRows[0]
        const rows = cleanRows.slice(1)
        blocks.push({
          type: 'table',
          headers,
          rows,
        })
        continue
      }
    }

    // Check for bullet list item: * ..., - ..., • ... or numbered list "1. ..."
    const listMatch = line.match(/^(?:[*•-]|(\d+)\.)\s+(.*)$/)
    if (listMatch) {
      const itemContent = listMatch[2].trim()

      if (!currentList) {
        currentList = { type: 'list', items: [] }
      }

      // 1. Check if item is a Driver Ranking card
      const driverData = parseDriverRanking(line)
      if (driverData) {
        currentList.items.push({
          type: 'driver-rank',
          ...driverData,
        })
        continue
      }

      // 2. Check if it's a key-value metric or a narrative note/callout
      const kvMatch = itemContent.match(/^(\*{0,2}(.*?)\*{0,2}):\s*(.*)$/)
      if (kvMatch) {
        const cleanLabel = kvMatch[2].replace(/\*\*/g, '').trim()
        const cleanValue = kvMatch[3].replace(/\*\*/g, '').trim()

        const isLongText = cleanValue.length > 40 || /[.?!]\s+[A-ZÀ-Ỹ]/.test(cleanValue)
        const isNoteLabel = /điểm sáng|lưu ý|cần lưu ý|khuyến nghị|nhận xét|hành động|đề xuất|chú ý|cải thiện/i.test(cleanLabel)

        if (isNoteLabel || isLongText) {
          flushList()
          const isWarning = /cảnh báo|lưu ý|cần lưu ý|chú ý/i.test(cleanLabel)
          const isDanger = /nguy hiểm|vi phạm nghiêm trọng/i.test(cleanLabel)
          const isSuccess = /điểm sáng|tốt|duy trì|khen ngợi|tích cực/i.test(cleanLabel)

          blocks.push({
            type: 'callout',
            title: `${cleanLabel}:`,
            content: cleanValue,
            severity: isDanger ? 'danger' : isWarning ? 'warning' : isSuccess ? 'info' : 'info',
          })
          continue
        }

        currentList.items.push({
          type: 'metric',
          label: cleanLabel,
          value: cleanValue,
          severity: getMetricType(cleanLabel, cleanValue),
        })
        continue
      }
    }

    // Not a list item -> flush any open list
    flushList()

    // Check for Callout (Nhận xét, Đánh giá, Lưu ý, Khuyến nghị, Cảnh báo, Đề xuất, Hành động)
    const calloutMatch = line.match(/^(\*{0,2}(Nhận xét|Đánh giá|Lưu ý|Khuyến nghị|Cảnh báo|Đề xuất|Hành động|Lời khuyên)\s*(?:& Hành động)?\s*:\*{0,2})\s*(.*)$/i)
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
        text: headingMatch[1].replace(/\*\*/g, ''),
      })
      continue
    }

    // Section title without heading markdown (e.g. "Chỉ số chính:" or "Tình trạng tài xế:")
    if (/^[A-ZÀ-Ỹ][^:\n]{2,40}:\s*$/.test(line)) {
      blocks.push({
        type: 'heading',
        text: line.replace(/:$/, '').replace(/\*\*/g, '').trim(),
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

        if (block.type === 'table') {
          return (
            <div key={idx} className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    {block.headers.map((header, hIdx) => (
                      <th key={hIdx}>{renderInline(header)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rIdx) => (
                    <tr key={rIdx}>
                      {row.map((cell, cIdx) => (
                        <td key={cIdx}>{renderInline(cell)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }

        if (block.type === 'list') {
          return (
            <ul key={idx} className={styles.list}>
              {block.items.map((item, itemIdx) => {
                // Driver Rank Item
                if (item.type === 'driver-rank') {
                  const isTopScore = item.score >= 90
                  const isLowScore = item.score < 80
                  const scorePillClass = isTopScore
                    ? styles.scorePillSuccess
                    : isLowScore
                    ? styles.scorePillDanger
                    : styles.scorePillWarning

                  return (
                    <li key={itemIdx} className={styles.driverCard}>
                      <div className={styles.driverInfo}>
                        <div className={styles.driverNameRow}>
                          {item.rank && <span className={styles.driverRank}>#{item.rank}</span>}
                          <span className={styles.driverName}>{item.name}</span>
                        </div>
                        <div className={styles.driverMeta}>
                          {item.sessions !== null && (
                            <span className={styles.metaBadge}>{item.sessions} phiên lái</span>
                          )}
                          {item.alerts !== null && (
                            <span
                              className={`${styles.metaBadge} ${
                                item.alerts > 0 ? styles.metaBadgeAlert : ''
                              }`}
                            >
                              {item.alerts} cảnh báo
                            </span>
                          )}
                          {!item.sessions && !item.alerts && item.details && (
                            <span className={styles.metaBadge}>{item.details}</span>
                          )}
                        </div>
                      </div>
                      <div className={styles.driverScore}>
                        <span className={`${styles.scorePill} ${scorePillClass}`}>
                          {item.score.toFixed(1)} / 100
                        </span>
                        <span className={styles.scoreLabel}>Điểm an toàn</span>
                      </div>
                    </li>
                  )
                }

                // Metric Key-Value Item
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
