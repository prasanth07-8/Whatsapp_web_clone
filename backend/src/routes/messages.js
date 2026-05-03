const router = require('express').Router();
const auth   = require('../middleware/auth');
const {
  sendMessage, getMessages, markAsRead, markAllRead,
  deleteMessage, editMessage, starMessage, pinMessage, getPinned, votePoll, getStarred, getAllMedia,
  reactToMessage,
} = require('../controllers/messageController');

router.post('/',                    auth, sendMessage);
router.get('/starred/all',          auth, getStarred);
router.get('/media/all',            auth, getAllMedia);
router.put('/markallread',          auth, markAllRead);
router.get('/:chatId',              auth, getMessages);
router.put('/:chatId/read',         auth, markAsRead);
router.delete('/:id',               auth, deleteMessage);
router.put('/:id/edit',             auth, editMessage);
router.put('/:id/star',             auth, starMessage);
router.put('/:id/pin',              auth, pinMessage);
router.get('/:chatId/pinned/list',  auth, getPinned);
router.put('/:id/vote',             auth, votePoll);
router.put('/:id/react',            auth, reactToMessage);

module.exports = router;
