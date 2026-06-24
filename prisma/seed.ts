import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const existing = await prisma.usuario.findFirst()
  if (existing) {
    console.log('Ya existen usuarios, seed ignorado.')
    return
  }

  const password = await bcrypt.hash('admin123', 10)
  await prisma.usuario.create({
    data: {
      nombre: 'Administrador',
      usuario: 'admin',
      password,
      nivelAcceso: 5,
      activo: true,
    },
  })
  console.log('Usuario admin creado: admin / admin123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
