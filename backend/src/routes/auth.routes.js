const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const auth = require('../middleware/auth');

router.post('/send-otp', ctrl.sendOtp);
router.post('/verify-otp', ctrl.verifyOtp);
router.get('/me', auth, ctrl.getMe);
router.put('/profile', auth, ctrl.updateProfile);

module.exports = router;
