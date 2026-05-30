const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const requireShopper = require('../middleware/requireShopper');
const ctrl = require('../controllers/requests.controller');

router.use(requireAuth);

router.get('/', ctrl.getRequests);
router.post('/', ctrl.createRequest);
router.patch('/:id/resolve', requireShopper, ctrl.resolveRequest);

module.exports = router;
