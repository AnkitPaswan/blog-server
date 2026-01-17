const express = require('express');
const router = express.Router();
const {
  getAllPosts,
  getPostById,
  incrementPostView,
  createPost,
  updatePost,
  deletePost,
  searchPosts,
  getDashboardStats,
  getHomePosts
} = require('../controllers/postController');

router.get('/', getAllPosts);
router.get("/home", getHomePosts);
router.get('/dashboard', getDashboardStats);
router.get('/search/:term', searchPosts);
router.get('/:id', getPostById);
router.post('/:id/view', incrementPostView);
router.post('/', createPost);
router.put('/:id', updatePost);
router.delete('/:id', deletePost);

module.exports = router;

