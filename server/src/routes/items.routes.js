const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const requireShopper = require('../middleware/requireShopper');
const ctrl = require('../controllers/items.controller');

router.use(requireAuth);

router.get('/', ctrl.getItems);
router.post('/', requireShopper, ctrl.createItem);
router.patch('/:id', ctrl.updateItem);
router.delete('/:id', requireShopper, ctrl.deleteItem);

module.exports = router;
