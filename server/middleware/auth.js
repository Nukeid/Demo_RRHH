const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'noguera-rrhh-secret-2024';

// Rutas públicas que no requieren token
const PUBLIC_PATHS = ['/api/auth/login'];

function authMiddleware(req, res, next) {
  // req.originalUrl tiene la URL completa independiente del punto de montaje
  const url = req.originalUrl.split('?')[0];
  if (!url.startsWith('/api') || PUBLIC_PATHS.includes(url)) {
    return next();
  }

  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) return res.status(401).json({ error: 'No autorizado — token requerido' });

  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// Middleware de control de acceso por rol y método HTTP
function methodAuthMiddleware(req, res, next) {
  const url = req.originalUrl.split('?')[0];
  if (!url.startsWith('/api') || PUBLIC_PATHS.includes(url)) return next();

  const rol = req.user?.rol;

  // DELETE → solo admin
  if (req.method === 'DELETE' && rol !== 'admin') {
    return res.status(403).json({ error: 'Solo administradores pueden eliminar registros' });
  }

  // POST / PUT → admin o editor
  if (['POST', 'PUT'].includes(req.method) && !['admin', 'editor'].includes(rol)) {
    return res.status(403).json({ error: 'Sin permisos para modificar datos' });
  }

  next();
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, rol: user.rol, email: user.email },
    SECRET,
    { expiresIn: '8h' }
  );
}

module.exports = { authMiddleware, methodAuthMiddleware, signToken };
