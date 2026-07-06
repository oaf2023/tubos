import { NextRequest, NextResponse } from 'next/server'

export function getRequestUser(req: NextRequest) {
  const raw = req.headers.get('x-user')
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export function requireGerenciaNivel0(req: NextRequest) {
  const user = getRequestUser(req)
  const rolNombre = user?.rol?.nombre || user?.rol
  if (!user || user.nivelAcceso !== 0 || rolNombre !== 'gerencia') {
    return NextResponse.json({ error: 'Solo Gerencia nivel 0 puede modificar esta configuración' }, { status: 403 })
  }
  return null
}
