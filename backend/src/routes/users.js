const router = require('express').Router();
const auth = require('../middleware/auth');
const { getUsers, getMe, findByEmail, updateProfile } = require('../controllers/userController');

router.get('/', auth, getUsers);
router.get('/me', auth, getMe);
router.get('/find', auth, findByEmail);
router.put('/profile', auth, updateProfile);

module.exports = router;
