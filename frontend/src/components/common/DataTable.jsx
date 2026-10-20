import { useState, useMemo } from 'react'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import EmptyState from './EmptyState'
import styles from './Common.module.css'

export default function DataTable({
  columns = [],
  data = [],
  searchPlaceholder = 'Tìm kiếm dữ liệu...',
  searchKey = 'name',
  searchFn,
  pageSize = 10,
  toolbarExtra,
  emptyTitle,
  emptyDescription,
}) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const filteredData = useMemo(() => {
    if (!search.trim()) return data
    const q = search.toLowerCase()
    if (searchFn) return data.filter((row) => searchFn(row, q))
    return data.filter((row) => {
      const val = row[searchKey]
      return val ? String(val).toLowerCase().includes(q) : false
    })
  }, [data, search, searchKey, searchFn])

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize))
  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredData.slice(start, start + pageSize)
  }, [filteredData, page, pageSize])

  const handleSearchChange = (e) => {
    setSearch(e.target.value)
    setPage(1)
  }

  return (
    <div className={styles.tableContainer}>
      <div className={styles.tableToolbar}>
        <div className={styles.searchBox}>
          <Search size={15} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder={searchPlaceholder}
            value={search}
            onChange={handleSearchChange}
          />
        </div>

        {toolbarExtra && <div>{toolbarExtra}</div>}
      </div>

      <div className={styles.tableResponsive}>
        {paginatedData.length === 0 ? (
          <EmptyState title={emptyTitle} description={emptyDescription} />
        ) : (
          <table className={styles.dataTable}>
            <thead>
              <tr>
                {columns.map((col, idx) => (
                  <th key={idx} style={col.width ? { width: col.width } : undefined}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row, rIdx) => (
                <tr key={row._id || rIdx}>
                  {columns.map((col, cIdx) => (
                    <td key={cIdx}>
                      {col.render ? col.render(row, rIdx) : row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 22px',
            borderTop: '1px solid var(--card-border)',
            fontSize: '13px',
            color: 'var(--text-secondary)',
          }}
        >
          <span>
            Hiển thị {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, filteredData.length)} / {filteredData.length} bản ghi
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              style={{
                background: '#FFFFFF',
                border: '1px solid var(--card-border)',
                color: page === 1 ? 'var(--text-muted)' : 'var(--text-main)',
                padding: '6px 12px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                cursor: page === 1 ? 'not-allowed' : 'pointer',
                boxShadow: 'var(--shadow-sm)',
              }}
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={16} />
              <span>Trước</span>
            </button>
            <span style={{ fontWeight: 700, color: 'var(--text-main)', padding: '0 4px' }}>
              {page} / {totalPages}
            </span>
            <button
              style={{
                background: '#FFFFFF',
                border: '1px solid var(--card-border)',
                color: page >= totalPages ? 'var(--text-muted)' : 'var(--text-main)',
                padding: '6px 12px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                boxShadow: 'var(--shadow-sm)',
              }}
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <span>Sau</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
