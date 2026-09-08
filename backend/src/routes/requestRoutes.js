const express = require('express');
const router = express.Router();
const { protect, hospitalOnly, donorOnly } = require('../middleware/auth');
const {
  createRequest, getHospitalRequests, respondToRequest, getOpenRequests
} = require('../controllers/requestController');

router.post('/', protect, hospitalOnly, createRequest);
router.get('/hospital', protect, hospitalOnly, getHospitalRequests);
router.get('/open', protect, donorOnly, getOpenRequests);
router.post('/:id/respond', protect, donorOnly, respondToRequest);

module.exports = router;
