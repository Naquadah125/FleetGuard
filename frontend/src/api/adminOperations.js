export function buildTripQuery(filters = {}) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries({
    start_date: filters.startDate,
    end_date: filters.endDate,
    driver_id: filters.driverId,
    driver_search: filters.driverSearch,
    status: filters.status,
    page: filters.page || 1,
    limit: filters.limit || 20,
  })) {
    if (value !== undefined && value !== null && value !== '') params.set(key, value)
  }
  return params
}

export async function fetchAdminTrips(token, filters) {
  const response = await fetch(`/api/analytics/admin/trips?${buildTripQuery(filters)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || !data.success) throw new Error(data.message || 'Không thể tải lịch sử chuyến đi.')
  return data
}

export async function recordAdminAudit(token, event) {
  await fetch('/api/analytics/admin/audit-log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(event),
  })
}

export async function fetchAdminAuditLog(token, filters = {}) {
  const params = new URLSearchParams()
  const normalizedFilters = { ...filters, resource_type: filters.resourceType }
  delete normalizedFilters.resourceType
  for (const [key, value] of Object.entries(normalizedFilters)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, value)
  }
  const response = await fetch(`/api/analytics/admin/audit-log?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || !data.success) throw new Error(data.message || 'Không thể tải audit log.')
  return data
}
