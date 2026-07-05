import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const roles = await db.rol.findMany({ orderBy: { nombre: 'asc' } })
    return NextResponse.json(roles)
  } catch {
    return NextResponse.json({ error: 'Error al obtener roles' }, { status: 500 })
  }
}
