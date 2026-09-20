const express = require('express');
const router = express.Router();
const { registerDonor, registerHospital, login, registerAdmin } = require('../controllers/authController');

router.post('/register/donor', registerDonor);
router.post('/register/hospital', registerHospital);
router.post('/register/admin', registerAdmin);
router.post('/login', login);

module.exports = router;
