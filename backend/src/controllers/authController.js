const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const generateTokens = (user) => {
  const access = jwt.sign(
    { id: user.id, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
  const refresh = jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
  return { access, refresh };
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password required' });

    const { rows } = await db.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true', [email]
    );
    if (!rows.length)
      return res.status(401).json({ message: 'Invalid credentials' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match)
      return res.status(401).json({ message: 'Invalid credentials' });

    const { access, refresh } = generateTokens(user);
    res.json({
      token: access,
      refreshToken: refresh,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken)
      return res.status(400).json({ message: 'Refresh token required' });

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const { rows } = await db.query(
      'SELECT * FROM users WHERE id = $1 AND is_active = true', [decoded.id]
    );
    if (!rows.length)
      return res.status(401).json({ message: 'User not found' });

    const { access, refresh } = generateTokens(rows[0]);
    res.json({ token: access, refreshToken: refresh });
  } catch (err) {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, name, email, role FROM users WHERE id = $1', [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
