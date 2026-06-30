import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      const { image } = await req.json()
      if (!image) {
        return NextResponse.json({ error: 'Imagen requerida (base64)' }, { status: 400 })
      }
      const cleaned = image.replace(/^data:image\/\w+;base64,/, '')
      const sizeMb = (cleaned.length * 3 / 4) / (1024 * 1024)
      if (sizeMb > 5) {
        return NextResponse.json({ error: 'La imagen no puede superar los 5MB' }, { status: 400 })
      }
      const mime = image.startsWith('data:') ? image.split(';')[0].split(':')[1] : 'image/jpeg'
      return NextResponse.json({ url: `data:${mime};base64,${cleaned}` })
    }

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData()
      const file = form.get('file') as File | null
      if (!file) {
        return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })
      }
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: 'La imagen no puede superar los 5MB' }, { status: 400 })
      }
      const buffer = Buffer.from(await file.arrayBuffer())
      const base64 = buffer.toString('base64')
      const mime = file.type || 'image/jpeg'
      return NextResponse.json({ url: `data:${mime};base64,${base64}` })
    }

    return NextResponse.json({ error: 'Content-Type no soportado. Usá JSON o FormData' }, { status: 400 })
  } catch (e) {
    console.error('POST /api/upload', e)
    return NextResponse.json({ error: 'Error al procesar la imagen' }, { status: 500 })
  }
}
