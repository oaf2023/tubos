const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
;(async () => {
  const users = await p.usuario.findMany({ include: { rol: true }, take: 20 })
  console.log(JSON.stringify(users.map(u => ({
    user: u.usuario,
    nombre: u.nombre,
    nivelAcceso: u.nivelAcceso,
    rol: u.rol?.nombre,
    activo: u.activo
  })), null, 2))
  await p.$disconnect()
})()
