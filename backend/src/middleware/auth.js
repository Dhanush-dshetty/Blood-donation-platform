const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token invalid or expired' });
  }
};

const hospitalOnly = (req, res, next) => {
  if (req.user.role !== 'hospital') {
    return res.status(403).json({ message: 'Access restricted to hospitals only' });
  }
  next();
};

const donorOnly = (req, res, next) => {
  if (req.user.role !== 'donor') {
    return res.status(403).json({ message: 'Access restricted to donors only' });
  }
  next();
};

module.exports = { protect, hospitalOnly, donorOnly };
