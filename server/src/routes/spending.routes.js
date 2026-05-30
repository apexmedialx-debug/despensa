const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const ctrl = require('../controllers/spending.controller');

router.use(requireAuth);
router.get('/', ctrl.getSpending);

module.exports = router;
