const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const requireAuth = require('../middleware/requireAuth');
const ctrl = require('../controllers/auth.controller');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

router.post('/register', authLimiter, ctrl.register);
router.post('/login', authLimiter, ctrl.login);
router.post('/refresh', ctrl.refresh);
router.post('/logout', ctrl.logout);
router.get('/me', requireAuth, ctrl.getMe);
router.patch('/me', requireAuth, ctrl.updateMe);

module.exports = router;
