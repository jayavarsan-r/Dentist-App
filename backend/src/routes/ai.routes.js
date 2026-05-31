const router = require('express').Router();
const ctrl = require('../controllers/ai.controller');
const auth = require('../middleware/auth');

router.post('/transcribe', auth, ctrl.uploadMiddleware, ctrl.transcribe);
router.post('/generate-note', auth, ctrl.generateNote);

module.exports = router;
