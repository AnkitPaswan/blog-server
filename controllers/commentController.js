const Comment = require('../models/CommentSchema');
const Post = require('../models/PostSchema');

// Create comment
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

    res.status(201).json(newComment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get comments by post
const getCommentsByPost = async (req, res) => {
  try {
    const normalizedPostId = Number(req.params.postId);

    const comments = await Comment.find({ postId: normalizedPostId }).sort({
      createdAt: -1
    });

    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete comment
const deleteComment = async (req, res) => {
  try {
    // Get comment first
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Delete comment
    await Comment.findByIdAndDelete(req.params.id);

    // Decrement comment count
    await Post.findOneAndUpdate(
      { id: Number(comment.postId) },
      { $inc: { commentCount: -1 } }
    );

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

