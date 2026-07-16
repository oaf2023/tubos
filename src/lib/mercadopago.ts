// Conector Mercado Pago Argentina
// Modo mock por defecto (MOCK_MERCADO_PAGO=true en .env)

import { getMercadoPagoCredentials } from '@/lib/mercadopago-config'

const MOCK_MODE = process.env.MOCK_MERCADO_PAGO !== 'false'

const API_BASE = 'https://api.mercadopago.com'

async function getAccessToken(): Promise<string | null> {
  if (MOCK_MODE) return 'mock_access_token'
  const credentials = await getMercadoPagoCredentials()
  return credentials?.accessToken || null
}

async function fetchMP(path: string) {
  const token = await getAccessToken()
  if (!token) return null
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  return res.json()
}

// ─── Mock Data ──────────────────────────────────────────

const MOCK_PAYMENTS = Array.from({ length: 25 }, (_, i) => ({
  id: 3000000 + i,
  order_id: 2309841 + i,
  status: ['approved', 'pending', 'rejected', 'refunded'][i % 4],
  payment_method: ['visa', 'master', 'rapipago', 'mercadopago_wallet'][i % 4],
  transaction_amount: 3000 + Math.round(Math.random() * 20000),
  net_amount: 2800 + Math.round(Math.random() * 18000),
  date_created: new Date(2026, 6, 5 - Math.floor(i / 4)).toISOString(),
  date_approved: new Date(2026, 6, 5 - Math.floor(i / 4) + 1).toISOString(),
}))

const MOCK_ACCOUNT_MOVEMENTS = Array.from({ length: 15 }, (_, i) => ({
  id: 5000000 + i,
  type: ['payment', 'refund', 'withdrawal', 'fee'][i % 4],
  status: ['available', 'unavailable', 'pending'][i % 3],
  amount: i % 2 === 0 ? 5000 + Math.round(Math.random() * 30000) : -2000 - Math.round(Math.random() * 10000),
  currency_id: 'ARS',
  date_created: new Date(2026, 6, 10 - i).toISOString(),
}))

// ─── Public API ──────────────────────────────────────────

export async function getPayments(fechaDesde?: string, fechaHasta?: string) {
  if (MOCK_MODE) return MOCK_PAYMENTS
  return fetchMP(`/v1/payments/search?sort=date_created&criteria=desc&range_date_created=${fechaDesde || '2026-01-01'},${fechaHasta || '2026-12-31'}`)
}

export async function getAccountMovements() {
  if (MOCK_MODE) return MOCK_ACCOUNT_MOVEMENTS
  return fetchMP(`/v1/advanced_payments/search`)
}

export async function getBalance() {
  if (MOCK_MODE) {
    return {
      total_available: 485000.50,
      total_pending: 156200.00,
      total_fees_current_month: 42300.80,
      total_refunds_current_month: 18300.25,
      total_releases_current_month: 312500.00,
      currency: 'ARS',
      release_summary: {
        by_week: [
          { week: 'Semana 1', amount: 82500 },
          { week: 'Semana 2', amount: 94500 },
          { week: 'Semana 3', amount: 71200 },
          { week: 'Semana 4', amount: 64300 },
        ],
      },
    }
  }
  return fetchMP(`/v1/account/money_balance`)
}

export async function getReleaseReport(fechaDesde?: string, fechaHasta?: string) {
  if (MOCK_MODE) {
    return {
      releases: Array.from({ length: 8 }, (_, i) => ({
        id: 6000000 + i,
        amount: 8000 + Math.round(Math.random() * 25000),
        status: ['released', 'pending', 'scheduled'][i % 3],
        payment_id: 3000000 + i * 3,
        release_date: new Date(2026, 6, 10 + i).toISOString(),
        estimated_release_date: new Date(2026, 6, 15 + i).toISOString(),
      })),
    }
  }
  return fetchMP(`/v1/releases/search?range_date=${fechaDesde || '2026-01-01'},${fechaHasta || '2026-12-31'}`)
}

export const isMock = () => MOCK_MODE
