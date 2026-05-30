const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { z } = require('zod');
const db = require('../db');
const { signAccessToken, signRefreshToken, verifyRefreshToken, refreshCookieOptions } = require('../utils/jwt');
const AppError = require('../utils/AppError');

const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  householdName: z.string().min(1).max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional().default(false),
});

const updateMeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatarInitials: z.string().max(3).optional(),
  avatarColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  pushSubscription: z.string().optional().nullable(),
});

async function register(req, res, next) {
  try {
    const data = registerSchema.parse(req.body);
    const existing = await db.findUserByEmail(data.email);
    if (existing) return next(new AppError('Email já está em uso', 409));

    const hashed = await bcrypt.hash(data.password, 12);
    const initials = data.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';

    const household = await db.createHousehold({
      name: data.householdName || `Casa de ${data.name}`,
      inviteCode: crypto.randomBytes(4).toString('hex').toUpperCase(),
    });

    const user = await db.createUser({
      name: data.name,
      email: data.email,
      password: hashed,
      role: 'SHOPPER',
      avatarInitials: initials,
      householdId: household.id,
    });

    const accessToken = signAccessToken({ id: user.id, role: user.role, householdId: user.householdId });
    const refreshToken = signRefreshToken({ id: user.id });
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    await db.createRefreshToken({
      token: tokenHash,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    res.cookie('refreshToken', refreshToken, refreshCookieOptions());
    const { password, ...safeUser } = user;
    res.status(201).json({ success: true, accessToken, user: safeUser });
  } catch (err) {
    if (err instanceof z.ZodError) return next(new AppError(err.errors[0].message, 400));
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const data = loginSchema.parse(req.body);
    const user = await db.findUserByEmail(data.email);
    if (!user) return next(new AppError('Credenciais inválidas', 401));

    const valid = await bcrypt.compare(data.password, user.password);
    if (!valid) return next(new AppError('Credenciais inválidas', 401));

    const accessToken = signAccessToken({ id: user.id, role: user.role, householdId: user.householdId });
    const refreshToken = signRefreshToken({ id: user.id }, data.rememberMe);
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const expiresAt = data.rememberMe
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.createRefreshToken({ token: tokenHash, userId: user.id, expiresAt });

    res.cookie('refreshToken', refreshToken, refreshCookieOptions(data.rememberMe));
    const { password, ...safeUser } = user;
    res.json({ success: true, accessToken, user: safeUser });
  } catch (err) {
    if (err instanceof z.ZodError) return next(new AppError(err.errors[0].message, 400));
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return next(new AppError('No refresh token', 401));

    let payload;
    try { payload = verifyRefreshToken(token); }
    catch { return next(new AppError('Invalid refresh token', 401)); }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const stored = await db.findRefreshToken(tokenHash);
    if (!stored || stored.expiresAt < new Date()) {
      return next(new AppError('Refresh token expired', 401));
    }

    const user = await db.findUserById(payload.id);
    if (!user) return next(new AppError('User not found', 401));

    const accessToken = signAccessToken({ id: user.id, role: user.role, householdId: user.householdId });
    const { password, ...safeUser } = user;
    res.json({ success: true, accessToken, user: safeUser });
  } catch (err) { next(err); }
}

async function logout(req, res, next) {
  try {
    const token = req.cookies?.refreshToken;
    if (token) {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      await db.deleteRefreshToken(tokenHash);
    }
    res.clearCookie('refreshToken', { path: '/' });
    res.json({ success: true });
  } catch (err) { next(err); }
}

async function getMe(req, res, next) {
  try {
    const user = await db.findUserById(req.user.id);
    if (!user) return next(new AppError('User not found', 404));
    const { password, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
  } catch (err) { next(err); }
}

async function updateMe(req, res, next) {
  try {
    const data = updateMeSchema.parse(req.body);
    const user = await db.updateUser(req.user.id, data);
    const { password, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
  } catch (err) {
    if (err instanceof z.ZodError) return next(new AppError(err.errors[0].message, 400));
    next(err);
  }
}

module.exports = { register, login, refresh, logout, getMe, updateMe };
