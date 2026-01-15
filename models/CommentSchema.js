const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    postId: { type: Number, required: true },
    name: { type: String, default: "Anonymous" },
    comment: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Comment", commentSchema);

