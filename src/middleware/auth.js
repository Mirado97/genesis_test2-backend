// src/middleware/auth.js
// JWT middleware — проверяет Bearer token в заголовке Authorization

const jwt = require('jsonwebtoken');

/**
 * Middleware: читает Authorization: Bearer <token>,
 * верифицирует JWT и записывает payload в req.user.
 *
 * При ошибке — 401 с описанием причины.
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Отсутствует или неверный заголовок Authorization',
    });
  }

  const token = authHeader.slice(7); // убираем "Bearer "

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { userId, tgId, username, iat, exp }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Unauthorized', message: 'Токен истёк' });
    }
    return res.status(401).json({ error: 'Unauthorized', message: 'Невалидный токен' });
  }
}

module.exports = authMiddleware;
