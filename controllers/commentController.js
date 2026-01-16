const Comment = require('../models/CommentSchema');
const Post = require('../models/PostSchema');
const { cacheService, CACHE_TTL, CACHE_KEYS } = require('../services/cacheService');

// Create comment (with cache invalidation)
const createComment = async (req, res) => {
  try {
    const { postId, name, comment } = req.body;

    if (!postId || !comment) {
      return res.status(400).json({ error: 'postId and comment are required' });
    }

    const normalizedPostId = Number(postId);

    const newComment = new Comment({
      postId: normalizedPostId,
      name: name || 'Anonymous',
      comment
    });

    await newComment.save();

    // Increment comment count
    await Post.findOneAndUpdate(
      { id: normalizedPostId },
      { $inc: { commentCount: 1 } }
    );

    // Invalidate comments cache for this post
    await cacheService.delete(`${CACHE_KEYS.COMMENTS}:${normalizedPostId}`);
    
    res.status(201).json(newComment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get comments by post with caching
const getCommentsByPost = async (req, res) => {
  try {
    const normalizedPostId = Number(req.params.postId);
    const cacheKey = `${CACHE_KEYS.COMMENTS}:${normalizedPostId}`;
    
    // Try to get from cache first
    const cachedComments = await cacheService.get(cacheKey);
    if (cachedComments) {
      return res.json(cachedComments);
    }

    // Cache miss, fetch from database
    const comments = await Comment.find({ postId: normalizedPostId }).sort({
      createdAt: -1
    });
    
    // Store in cache
    await cacheService.set(cacheKey, comments, CACHE_TTL.MEDIUM);
    
    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete comment (with cache invalidation)
const deleteComment = async (req, res) => {
  try {
    // Get comment first
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    const postId = Number(comment.postId);

    // Delete comment
    await Comment.findByIdAndDelete(req.params.id);

    // Decrement comment count
    await Post.findOneAndUpdate(
      { id: postId },
      { $inc: { commentCount: -1 } }
    );

    // Invalidate comments cache for this post
    await cacheService.delete(`${CACHE_KEYS.COMMENTS}:${postId}`);

    res.json({ message: 'Comment deleted & count updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createComment,
  getCommentsByPost,
  deleteComment
};

