const Post = require('../models/PostSchema');
const { cacheService, CACHE_TTL, CACHE_KEYS } = require('../services/cacheService');

// Get all posts with caching
const getAllPosts = async (req, res) => {
  try {
    const { category } = req.query;
    const cacheKey = category && category !== 'All' 
      ? `${CACHE_KEYS.POSTS}:all:${category.toLowerCase()}`
      : `${CACHE_KEYS.POSTS}:all:all`;

    // Try to get from cache first
    const cachedPosts = await cacheService.get(cacheKey);
    if (cachedPosts) {
      return res.json(cachedPosts);
    }

    // Cache miss, fetch from database
    let query = {};
    if (category && category !== 'All') {
      query.category = new RegExp(category, 'i');
    }

    const posts = await Post.find(query).sort({ createdAt: -1 });
    
    // Store in cache
    await cacheService.set(cacheKey, posts, CACHE_TTL.LONG);
    
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get post by ID with caching
const getPostById = async (req, res) => {
  try {
    const cacheKey = `${CACHE_KEYS.POST}:${req.params.id}`;
    
    // Try to get from cache first
    const cachedPost = await cacheService.get(cacheKey);
    if (cachedPost) {
      return res.json(cachedPost);
    }

    // Cache miss, fetch from database
    const post = await Post.findOne({ id: req.params.id });
    if (!post) return res.status(404).json({ message: 'Post not found' });
    
    // Store in cache
    await cacheService.set(cacheKey, post, CACHE_TTL.LONG);
    
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Increment post view (with cache invalidation)
const incrementPostView = async (req, res) => {
  try {
    await Post.findOneAndUpdate(
      { id: req.params.id },
      { $inc: { views: 1 } }
    );
    
    // Invalidate cache for this post
    await cacheService.delete(`${CACHE_KEYS.POST}:${req.params.id}`);
    
    res.sendStatus(200);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create new post (with cache invalidation)
const createPost = async (req, res) => {
  try {
    const newPost = new Post({
      id: Date.now(),
      ...req.body
    });
    const savedPost = await newPost.save();
    
    // Invalidate posts cache
    await cacheService.clearPrefix(CACHE_KEYS.POSTS);
    
    res.status(201).json(savedPost);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update post (with cache invalidation)
const updatePost = async (req, res) => {
  try {
    const updatedPost = await Post.findOneAndUpdate(
      { id: req.params.id },
      req.body,
      { new: true }
    );
    
    if (!updatedPost) return res.status(404).json({ message: 'Post not found' });
    
    // Invalidate cache for this post and posts list
    await cacheService.delete(`${CACHE_KEYS.POST}:${req.params.id}`);
    await cacheService.clearPrefix(CACHE_KEYS.POSTS);
    
    res.json(updatedPost);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete post (with cache invalidation)
const deletePost = async (req, res) => {
  try {
    const deletedPost = await Post.findOneAndDelete({ id: req.params.id });
    if (!deletedPost) return res.status(404).json({ message: 'Post not found' });
    
    // Invalidate cache for this post and posts list
    await cacheService.delete(`${CACHE_KEYS.POST}:${req.params.id}`);
    await cacheService.clearPrefix(CACHE_KEYS.POSTS);
    
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Search posts with caching
const searchPosts = async (req, res) => {
  try {
    const term = req.params.term;
    const cacheKey = `${CACHE_KEYS.SEARCH}:${term.toLowerCase()}`;
    
    // Try to get from cache first
    const cachedResults = await cacheService.get(cacheKey);
    if (cachedResults) {
      return res.json(cachedResults);
    }

    // Cache miss, search in database
    const posts = await Post.find({
      $or: [
        { title: new RegExp(term, 'i') },
        { content: new RegExp(term, 'i') },
        { caption: new RegExp(term, 'i') },
        { tag: new RegExp(term, 'i') },
        { category: new RegExp(term, 'i') },
      ]
    }).sort({ createdAt: -1 });
    
    // Store in cache with shorter TTL for search results
    await cacheService.set(cacheKey, posts, CACHE_TTL.MEDIUM);
    
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Dashboard stats with caching
const getDashboardStats = async (req, res) => {
  try {
    const cacheKey = CACHE_KEYS.STATS;
    
    // Try to get from cache first
    const cachedStats = await cacheService.get(cacheKey);
    if (cachedStats) {
      return res.json(cachedStats);
    }

    // Cache miss, fetch from database
    const [postCount, viewAggregation, commentAggregation] = await Promise.all([
      Post.countDocuments(),
      Post.aggregate([{ $group: { _id: null, totalViews: { $sum: "$views" } } }]),
      Post.aggregate([{ $group: { _id: null, totalComments: { $sum: "$commentCount" } } }])
    ]);

    const stats = {
      totalPosts: postCount,
      totalViews: viewAggregation[0]?.totalViews || 0,
      totalComments: commentAggregation[0]?.totalComments || 0
    };
    
    // Store in cache
    await cacheService.set(cacheKey, stats, CACHE_TTL.MEDIUM);
    
    res.json(stats);
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

