const router = require('express').Router();
const auth   = require('../middleware/auth');
const { accessChat, accessSavedMessages, getChats, clearChat, deleteChat, toggleFavourite, togglePin, toggleArchive, markChatRead, saveDraft } = require('../controllers/chatController');

router.post('/saved',                 auth, accessSavedMessages);
router.post('/',                      auth, accessChat);
router.get('/',                       auth, getChats);
router.put('/:chatId/clear',          auth, clearChat);
router.put('/:chatId/favourite',      auth, toggleFavourite);
router.put('/:chatId/pin',            auth, togglePin);
router.put('/:chatId/archive',        auth, toggleArchive);
router.put('/:chatId/markread',       auth, markChatRead);
router.put('/:chatId/draft',          auth, saveDraft);
router.delete('/:chatId',             auth, deleteChat);

module.exports = router;
