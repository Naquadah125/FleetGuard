import { Inbox } from 'lucide-react'
import styles from './Common.module.css'

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'Không có dữ liệu',
  description = 'Chưa có bản ghi nào phù hợp với bộ lọc hiện tại.',
  action,
}) {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>
        <Icon size={26} />
      </div>
      <h4 className={styles.emptyTitle}>{title}</h4>
      <p className={styles.emptyDesc}>{description}</p>
      {action && <div>{action}</div>}
    </div>
  )
}
