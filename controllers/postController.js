const Post = require('../models/PostSchema');

// Get all posts
const getAllPosts = async (req, res) => {
  try {
    const { category } = req.query;
    let query = {};

    if (category && category !== 'All') {
      query.category = new RegExp(category, 'i');
    }

    const posts = await Post.find(query).sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get post by ID
const getPostById = async (req, res) => {
  try {
    const post = await Post.findOne({ id: req.params.id });
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Increment post view
const incrementPostView = async (req, res) => {
  try {
    await Post.findOneAndUpdate(
      { id: req.params.id },
      { $inc: { views: 1 } }
    );
    res.sendStatus(200);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create new post
const createPost = async (req, res) => {
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
};

// Update post
const updatePost = async (req, res) => {
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
};

// Delete post
const deletePost = async (req, res) => {
  try {
    const deletedPost = await Post.findOneAndDelete({ id: req.params.id });
    if (!deletedPost) return res.status(404).json({ message: 'Post not found' });
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Search posts
const searchPosts = async (req, res) => {
  try {
    const term = req.params.term;
    const posts = await Post.find({
      $or: [
        { title: new RegExp(term, 'i') },
        { content: new RegExp(term, 'i') },
        { caption: new RegExp(term, 'i') },
        { tag: new RegExp(term, 'i') },
        { category: new RegExp(term, 'i') },
      ]
    }).sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Dashboard stats
const getDashboardStats = async (req, res) => {
  try {
    const [postCount, viewAggregation, commentAggregation] = await Promise.all([
      Post.countDocuments(),
      Post.aggregate([{ $group: { _id: null, totalViews: { $sum: "$views" } } }]),
      Post.aggregate([{ $group: { _id: null, totalComments: { $sum: "$commentCount" } } }])
    ]);

    res.json({
      totalPosts: postCount,
      totalViews: viewAggregation[0]?.totalViews || 0,
      totalComments: commentAggregation[0]?.totalComments || 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllPosts,
  getPostById,
  incrementPostView,
  createPost,
  updatePost,
  deletePost,
  searchPosts,
  getDashboardStats
};

