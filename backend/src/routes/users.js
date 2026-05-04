const router = require('express').Router();
const auth = require('../middleware/auth');
const { getUsers, getMe, findByEmail, updateProfile, toggleBlock, getBlockStatus } = require('../controllers/userController');

router.get('/', auth, getUsers);
router.get('/me', auth, getMe);
router.get('/find', auth, findByEmail);
router.put('/profile', auth, updateProfile);
router.put('/block/:userId', auth, toggleBlock);
router.get('/block/:userId', auth, getBlockStatus);

module.exports = router;
