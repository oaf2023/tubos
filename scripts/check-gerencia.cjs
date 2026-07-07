const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient();
(async () => {
  const r = await p.rol.findUnique({ where: { nombre: 'gerencia' } })
  console.log('Rol:', JSON.stringify(r))
  const u = await p.usuario.findUnique({ where: { usuario: 'admin_gerencia' }, include: { rol: true } })
  console.log('User:', JSON.stringify(u, (k, v) => k === 'password' ? '***' : v))
  await p['$disconnect']()
})()
