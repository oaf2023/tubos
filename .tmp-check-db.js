const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  try {
    const users = await p.usuario.findMany({ include: { rol: true } });
    console.log('Users:', users.length);
    users.forEach(u => console.log(' -', u.usuario, 'activo:', u.activo, 'rol:', u.rol?.nombre));
    
    const roles = await p.rol.findMany();
    console.log('Roles:', roles.length);
    roles.forEach(r => console.log(' -', r.nombre, r.descripcion));
    
    const auditCount = await p.auditLog.count();
    console.log('AuditLog entries:', auditCount);
    
    console.log('\nTesting audit log creation...');
    await p.auditLog.create({
      data: {
        accion: 'LOGIN',
        entidad: 'Usuario',
        entidadId: 'test',
        usuario: 'admin',
        detalle: JSON.stringify({ test: true }),
        direccionIp: '127.0.0.1',
      }
    });
    console.log('AuditLog creation OK');
    
    console.log('\nTesting login flow...');
    const found = await p.usuario.findUnique({
      where: { usuario: 'admin' },
      include: { rol: true },
    });
    if (found) {
      console.log('User found:', found.usuario, 'activo:', found.activo, 'rol:', found.rol?.nombre);
      const pwMatch = require('bcryptjs').compareSync('admin123', found.password);
      console.log('Password match:', pwMatch);
    } else {
      console.log('User NOT found - seed missing!');
    }
  } catch(e) {
    console.error('ERROR:', e.message);
    if (e.stack) console.error(e.stack.substring(0, 1000));
  } finally {
    await p.$disconnect();
  }
})();
