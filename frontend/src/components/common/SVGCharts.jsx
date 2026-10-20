// Hand-built SVG Charts with enterprise white-mode styling

export function BarChart({
  data = [], // [{ label: 'T2', value: 3 }, ...]
  height = 160,
  barColor = '#F59E0B',
  activeBarColor = '#EF4444',
}) {
  const maxVal = Math.max(1, ...data.map((d) => d.value))

  return (
    <div style={{ width: '100%', height }}>
      <svg width="100%" height={height} viewBox={`0 0 ${data.length * 48} ${height}`} preserveAspectRatio="none">
        {/* Horizontal grid lines */}
        <line x1="0" y1={height - 24} x2={data.length * 48} y2={height - 24} stroke="rgba(15, 23, 42, 0.1)" strokeWidth="1" />
        <line x1="0" y1={(height - 24) / 2} x2={data.length * 48} y2={(height - 24) / 2} stroke="rgba(15, 23, 42, 0.05)" strokeDasharray="3 3" />

        {data.map((item, idx) => {
          const barHeight = Math.max(4, ((item.value || 0) / maxVal) * (height - 40))
          const x = idx * 48 + 14
          const y = height - 24 - barHeight
          const isHigh = item.value >= 3

          return (
            <g key={idx}>
              {/* Bar */}
              <rect
                x={x}
                y={y}
                width="20"
                height={barHeight}
                rx="4"
                fill={isHigh ? activeBarColor : barColor}
                opacity={item.value > 0 ? 0.95 : 0.25}
              />
              {/* Value on top of bar */}
              {item.value > 0 && (
                <text
                  x={x + 10}
                  y={y - 4}
                  textAnchor="middle"
                  fill="var(--text-main)"
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {item.value}
                </text>
              )}
              {/* Label */}
              <text
                x={x + 10}
                y={height - 8}
                textAnchor="middle"
                fill="var(--text-secondary)"
                fontSize="11"
                fontFamily="sans-serif"
              >
                {item.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export function LineChart({
  series = [], // [{ name: 'EAR', color: '#38BDF8', data: [0.3, 0.28, ...] }]
  markers = [], // [{ index: 12, label: 'Ngủ gật', color: '#EF4444' }]
  height = 200,
  thresholds = [], // [{ value: 0.21, color: '#EF4444', label: 'Ngưỡng EAR 0.21' }]
  min = 0,
  max = 1,
}) {
  const pointsCount = Math.max(2, ...series.map((s) => s.data.length))
  const chartWidth = 600
  const chartHeight = height - 30

  const getY = (val) => {
    const clamped = Math.max(min, Math.min(max, val))
    return chartHeight - ((clamped - min) / (max - min)) * (chartHeight - 20) - 10
  }

  const getX = (idx) => (idx / (pointsCount - 1)) * (chartWidth - 40) + 20

  return (
    <div style={{ width: '100%', height }}>
      <svg width="100%" height={height} viewBox={`0 0 ${chartWidth} ${height}`}>
        {/* Background grid */}
        <line x1="20" y1="10" x2={chartWidth - 20} y2="10" stroke="rgba(15, 23, 42, 0.08)" strokeWidth="1" />
        <line x1="20" y1={chartHeight / 2} x2={chartWidth - 20} y2={chartHeight / 2} stroke="rgba(15, 23, 42, 0.05)" strokeDasharray="4 4" />
        <line x1="20" y1={chartHeight} x2={chartWidth - 20} y2={chartHeight} stroke="rgba(15, 23, 42, 0.12)" strokeWidth="1" />

        {/* Threshold lines */}
        {thresholds.map((t, i) => {
          const y = getY(t.value)
          return (
            <g key={i}>
              <line x1="20" y1={y} x2={chartWidth - 20} y2={y} stroke={t.color} strokeWidth="1.5" strokeDasharray="3 3" opacity="0.8" />
              <text x={chartWidth - 22} y={y - 4} textAnchor="end" fill={t.color} fontSize="10" fontFamily="sans-serif">
                {t.label}
              </text>
            </g>
          )
        })}

        {/* Series lines */}
        {series.map((s, sIdx) => {
          if (!s.data || s.data.length === 0) return null
          const pathD = s.data
            .map((val, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx).toFixed(1)} ${getY(val).toFixed(1)}`)
            .join(' ')

          return (
            <g key={sIdx}>
              <path d={pathD} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          )
        })}

        {/* Violation Markers */}
        {markers.map((m, mIdx) => {
          const x = getX(m.index)
          return (
            <g key={mIdx}>
              <line x1={x} y1="10" x2={x} y2={chartHeight} stroke={m.color || '#EF4444'} strokeWidth="1.5" strokeDasharray="2 2" />
              <circle cx={x} cy="14" r="5" fill={m.color || '#EF4444'} />
              <text x={x} y="30" textAnchor="middle" fill={m.color || '#EF4444'} fontSize="9" fontWeight="bold">
                {m.label}
              </text>
            </g>
          )
        })}

        {/* Time labels */}
        <text x="20" y={height - 8} fill="var(--text-muted)" fontSize="10" fontFamily="sans-serif">
          Bắt đầu (0s)
        </text>
        <text x={chartWidth / 2} y={height - 8} textAnchor="middle" fill="var(--text-muted)" fontSize="10" fontFamily="sans-serif">
          Thời gian hành trình
        </text>
        <text x={chartWidth - 20} y={height - 8} textAnchor="end" fill="var(--text-muted)" fontSize="10" fontFamily="sans-serif">
          Kết thúc
        </text>
      </svg>
    </div>
  )
}

export function Sparkline({ data = [], color = '#38BDF8', width = 100, height = 28 }) {
  if (!data || data.length < 2) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * (width - 4) + 2
      const y = height - 4 - ((val - min) / range) * (height - 8)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
