const jwt = require('jsonwebtoken');

const ACCESS_EXPIRY = '15m';
const REFRESH_EXPIRY = '7d';
const REFRESH_EXPIRY_REMEMBER = '30d';

function signAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY });
}

function signRefreshToken(payload, rememberMe = false) {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: rememberMe ? REFRESH_EXPIRY_REMEMBER : REFRESH_EXPIRY,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

function refreshCookieOptions(rememberMe = false) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000,
    path: '/',
  };
}

module.exports = { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken, refreshCookieOptions };
