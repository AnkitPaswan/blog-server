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
    const postId = Number(req.params.postId);
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const skip = (page - 1) * limit;

    // cache key should include page & limit
    const cacheKey = `${CACHE_KEYS.COMMENTS}:${postId}:page:${page}:limit:${limit}`;

    // 1️⃣ Try cache
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // 2️⃣ Fetch from DB
    const [comments, total] = await Promise.all([
      Comment.find({ postId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Comment.countDocuments({ postId })
    ]);

    const response = {
      comments,
      page,
      limit,
      totalComments: total,
      // totalPages: Math.ceil(total / limit),
      hasMore: skip + comments.length < total
    };

    // 3️⃣ Cache response
    await cacheService.set(cacheKey, response, CACHE_TTL.MEDIUM);

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: error.message });
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

