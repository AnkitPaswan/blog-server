const express = require('express');
const router = express.Router();
const Post = require('../model/PostSchema');

// Get all posts
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    let query = {};

    if (category && category !== 'All') {
      query.category = new RegExp(category, 'i'); // Case insensitive search
    }

    const posts = await Post.find(query).sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get post by ID
router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findOne({ id: req.params.id });
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new post
router.post('/', async (req, res) => {
  try {
    const newPost = new Post({
      id: Date.now(),
      ...req.body
    });
    const savedPost = await newPost.save();
    res.status(201).json(savedPost);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update post
router.put('/:id', async (req, res) => {
  try {
    const updatedPost = await Post.findOneAndUpdate(
      { id: req.params.id },
      req.body,
      { new: true }
    );
    if (!updatedPost) return res.status(404).json({ message: 'Post not found' });
    res.json(updatedPost);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete post
router.delete('/:id', async (req, res) => {
  try {
    const deletedPost = await Post.findOneAndDelete({ id: req.params.id });
    if (!deletedPost) return res.status(404).json({ message: 'Post not found' });
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Search posts
router.get('/search/:term', async (req, res) => {
  try {
    const term = req.params.term;
    const posts = await Post.find({
      $or: [
        { text: new RegExp(term, 'i') },
        { caption: new RegExp(term, 'i') },
        { user: new RegExp(term, 'i') },
        { handle: new RegExp(term, 'i') },
        { tag: new RegExp(term, 'i') },
        { category: new RegExp(term, 'i') },
      ]
    }).sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
