import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

async function seed() {
  const p = new PrismaClient()
  try {
    const count = await p.usuario.count()
    if (count > 0) {
      console.log(`[seed] Users exist (${count}), skipping`)
      return
    }
    const hash = await bcrypt.hash('admin123', 10)
    let rol = await p.rol.findUnique({ where: { nombre: 'admin' } })
    if (!rol) {
      rol = await p.rol.create({
        data: { nombre: 'admin', descripcion: 'Administrador del sistema' }
      })
    }
    await p.usuario.create({
      data: {
        nombre: 'Administrador',
        usuario: 'admin',
        password: hash,
        nivelAcceso: 5,
        activo: true,
        rolId: rol.id
      }
    })
    console.log('[seed] Admin user created: admin / admin123')
  } finally {
    await p.$disconnect()
  }
}
seed().catch(e => { console.error('[seed] Error:', e.message); process.exit(1) })
