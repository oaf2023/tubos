import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'

const PUBLIC_PATHS = [
  '/api/auth/login',
  '/api/auth/login-cliente',
  '/api/chofer/login',
  '/api/chofer/heartbeat',
  '/api/chofer/mi-ruta',
  '/api/gps/ping',
  '/_next/',
  '/favicon.ico',
  '/manifest.webmanifest',
  '/sw.js',
  '/api/chofer/activos',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))
  if (isPublic) {
    return NextResponse.next()
  }

  const token = request.cookies.get('session')?.value
  if (token) {
    const user = await verifySession(token)
    if (user) {
      const requestHeaders = new Headers(request.headers)
      requestHeaders.set('x-user', JSON.stringify(user))
      return NextResponse.next({
        request: { headers: requestHeaders },
      })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
