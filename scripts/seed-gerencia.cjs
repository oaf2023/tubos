const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

;(async () => {
  // Crear rol 'gerencia' si no existe
  let rol = await prisma.rol.findUnique({ where: { nombre: 'gerencia' } })
  if (!rol) {
    rol = await prisma.rol.create({
      data: { nombre: 'gerencia', descripcion: 'Acceso al módulo Gerencia con ML/MP' },
    })
    console.log('Rol "gerencia" creado:', rol.id)
  } else {
    console.log('Rol "gerencia" ya existe')
  }

  // Crear usuario admin_gerencia si no existe
  const user = await prisma.usuario.findUnique({ where: { usuario: 'admin_gerencia' } })
  if (!user) {
    const password = await bcrypt.hash('Gerencia2024', 10)
    const nuevo = await prisma.usuario.create({
      data: {
        nombre: 'Admin Gerencia',
        usuario: 'admin_gerencia',
        password,
        nivelAcceso: 0,
        activo: true,
        email: 'gerencia@districon.com',
        rolId: rol.id,
      },
    })
    console.log('Usuario admin_gerencia creado:', nuevo.usuario, '/ Gerencia2024')
  } else {
    console.log('Usuario admin_gerencia ya existe')
  }

  await prisma.$disconnect()
})()
