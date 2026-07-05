// Conector Mercado Libre Argentina
// Modo mock por defecto (MOCK_MERCADO_LIBRE=true en .env)

const MOCK_MODE = process.env.MOCK_MERCADO_LIBRE !== 'false'

const API_BASE = 'https://api.mercadolibre.com'

async function getAccessToken(): Promise<string | null> {
  if (MOCK_MODE) return 'mock_access_token'
  const clientId = process.env.MERCADOLIBRE_CLIENT_ID
  const clientSecret = process.env.MERCADOLIBRE_CLIENT_SECRET
  if (!clientId || !clientSecret) return null
  const res = await fetch(`${API_BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret }),
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.access_token
}

async function fetchML(path: string) {
  const token = await getAccessToken()
  if (!token) return null
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  return res.json()
}

// ─── Mock Data ──────────────────────────────────────────

const MOCK_ORDERS = Array.from({ length: 20 }, (_, i) => ({
  id: 2309841 + i,
  pack_id: i % 3 === 0 ? 567800 + i : null,
  status: ['paid', 'shipped', 'delivered', 'cancelled', 'payment_required'][i % 5],
  total_amount: 3000 + Math.round(Math.random() * 20000),
  buyer: { nickname: `comprador${i + 1}` },
  date_created: new Date(2026, 6, 5 - Math.floor(i / 3)).toISOString(),
  order_items: [
    { item: { id: `MLA${900000 + i}` }, quantity: Math.ceil(Math.random() * 5), unit_price: 2000 + Math.round(Math.random() * 8000) },
  ],
}))

const MOCK_SHIPMENTS = Array.from({ length: 10 }, (_, i) => ({
  id: 4500000 + i,
  order_id: 2309841 + i,
  status: ['pending', 'shipped', 'delivered', 'delayed'][i % 4],
  substatus: null,
  carrier: ['OCA', 'Andreani', 'Correo Argentino'][i % 3],
  tracking: `TRK${100000 + i}`,
  date_created: new Date(2026, 6, 5 - i).toISOString(),
}))

const MOCK_ITEMS = Array.from({ length: 15 }, (_, i) => ({
  id: `MLA${900000 + i}`,
  title: ['Caudalímetro Argón 0-25L', 'Válvula Cilindro GAS', 'Manómetro 0-250 bar', 'Tubo Cupla Cobre 1/2', 'Argón 5.0 10L'][i % 5],
  price: 1500 + Math.round(Math.random() * 15000),
  available_quantity: Math.floor(Math.random() * 50),
  sold_quantity: Math.floor(Math.random() * 100),
  status: ['active', 'paused', 'closed'][i % 3],
  date_created: new Date(2026, 4, 1).toISOString(),
}))

const MOCK_CLAIMS = Array.from({ length: 5 }, (_, i) => ({
  id: 700000 + i,
  order_id: 2309845 + i,
  type: ['claim', 'return', 'mediation'][i % 3],
  status: ['open', 'resolved', 'under_review'][i % 3],
  reason: ['Producto defectuoso', 'No recibido', 'Daño en transporte'][i % 3],
  amount: 2000 + Math.round(Math.random() * 8000),
  date_created: new Date(2026, 6, 3 - i).toISOString(),
}))

const MOCK_QUESTIONS = Array.from({ length: 8 }, (_, i) => ({
  id: 800000 + i,
  item_id: `MLA${900000 + i}`,
  text: ['¿Tienen stock?', '¿Hacen envíos al interior?', '¿Cuál es el plazo de entrega?', '¿Precio por mayor?', '¿Incluye válvula?', '¿Tienen factura A?', '¿Garantía?', '¿Se puede retirar por sucursal?'][i],
  answer: i % 2 === 0 ? 'Sí, tenemos stock disponible. Consulte por cantidad.' : null,
  status: i % 2 === 0 ? 'ANSWERED' : 'UNANSWERED',
  date_created: new Date(2026, 6, 5 - Math.floor(i / 2)).toISOString(),
}))

// ─── Public API ──────────────────────────────────────────

export async function getOrders(fechaDesde?: string, fechaHasta?: string) {
  if (MOCK_MODE) return MOCK_ORDERS
  return fetchML(`/orders/search?seller=me&order.date_created.from=${fechaDesde || '2026-01-01'}&order.date_created.to=${fechaHasta || '2026-12-31'}`)
}

export async function getShipments() {
  if (MOCK_MODE) return MOCK_SHIPMENTS
  return fetchML(`/shipments/search?seller=me`)
}

export async function getItems() {
  if (MOCK_MODE) return MOCK_ITEMS
  return fetchML(`/users/me/items/search`)
}

export async function getClaims() {
  if (MOCK_MODE) return MOCK_CLAIMS
  return fetchML(`/claims/search?seller=me`)
}

export async function getQuestions() {
  if (MOCK_MODE) return MOCK_QUESTIONS
  return fetchML(`/questions/search?seller=me`)
}

export async function getOrderDetail(orderId: number) {
  if (MOCK_MODE) return MOCK_ORDERS.find(o => o.id === orderId) || MOCK_ORDERS[0]
  return fetchML(`/orders/${orderId}`)
}

export const isMock = () => MOCK_MODE
