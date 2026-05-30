const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const requireShopper = require('../middleware/requireShopper');
const ctrl = require('../controllers/household.controller');

router.use(requireAuth);

router.get('/', ctrl.getHousehold);
router.post('/join', ctrl.joinHousehold);
router.patch('/member/:id', requireShopper, ctrl.updateMember);
router.delete('/member/:id', requireShopper, ctrl.removeMember);
router.post('/invite/regenerate', requireShopper, ctrl.regenerateInvite);

module.exports = router;
