import { SignJWT, jwtVerify } from 'jose'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const getSecret = () => {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET no configurado')
  return new TextEncoder().encode(secret)
}

export interface SessionUser {
  id: string
  nombre: string
  usuario: string
  rolId: string
  rol: string
  tipo: 'usuario' | 'cliente'
  clienteId?: string
}

export async function createSession(user: SessionUser): Promise<string> {
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .setIssuedAt()
    .sign(getSecret())
  return token
}

export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload as unknown as SessionUser
  } catch {
    return null
  }
}

export async function getSessionFromCookie(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return null
  return verifySession(token)
}

export async function setSessionCookie(response: NextResponse, user: SessionUser): Promise<void> {
  const token = await createSession(user)
  response.cookies.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24,
  })
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set('session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}

type Rol = 'admin' | 'deposito' | 'reparto' | 'facturacion' | 'auditor'

export function requireRole(...roles: Rol[]) {
  return async (req: NextRequest): Promise<NextResponse | null> => {
    const userHeader = req.headers.get('x-user')
    if (!userHeader) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    try {
      const user = JSON.parse(userHeader) as SessionUser
      if (!user.rol) {
        return NextResponse.json({ error: 'Sin rol asignado' }, { status: 403 })
      }

      if (!roles.includes(user.rol as Rol)) {
        return NextResponse.json({ error: 'Permiso denegado' }, { status: 403 })
      }

      return null
    } catch {
      return NextResponse.json({ error: 'Error de autorización' }, { status: 500 })
    }
  }
}
