const express = require('express');
const router = express.Router();
const { protect, hospitalOnly } = require('../middleware/auth');
const { addBloodUnit, getInventory, verifyBeforeTransfusion } = require('../controllers/inventoryController');

router.post('/', protect, hospitalOnly, addBloodUnit);
router.get('/', protect, hospitalOnly, getInventory);
router.post('/verify-transfusion', protect, hospitalOnly, verifyBeforeTransfusion);

module.exports = router;
