const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const p = new PrismaClient();

(async () => {
  try {
    const users = await p.usuario.findMany({ include: { rol: true } });
    console.log('Users:', users.length);
    users.forEach(u => console.log(' -', u.usuario, 'activo:', u.activo));
    
    const admin = await p.usuario.findUnique({ where: { usuario: 'admin' } });
    if (admin) {
      console.log('Admin found, password hash:', admin.password.substring(0, 20) + '...');
      const pwMatch = bcrypt.compareSync('admin123', admin.password);
      console.log('Password match:', pwMatch);
    } else {
      console.log('Admin NOT found');
    }

    // Try creating audit log
    console.log('\nTesting audit log...');
    await p.auditLog.create({
      data: {
        accion: 'LOGIN',
        entidad: 'Usuario',
        entidadId: 'test',
        usuario: 'admin',
        detalle: '{}',
        direccionIp: 'test',
      }
    });
    console.log('Audit log OK');

  } catch(e) {
    console.error('ERROR:', e.message);
    if (e.code) console.error('Code:', e.code);
    if (e.stack) console.error(e.stack.substring(0, 500));
  } finally {
    await p.$disconnect();
  }
})();
