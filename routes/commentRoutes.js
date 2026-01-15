const express = require('express');
const router = express.Router();
const {
  createComment,
  getCommentsByPost,
  deleteComment
} = require('../controllers/commentController');

router.post('/', createComment);
router.get('/:postId', getCommentsByPost);
router.delete('/:id', deleteComment);

module.exports = router;

