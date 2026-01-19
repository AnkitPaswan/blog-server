const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      unique: true,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    caption: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      required: true,
    },
    tag: {
      type: String,
      default: "",
    },
    image: {
      type: String,
      default: "",
    },
    trivia: {
      type: String,
      default: "",
    },
    commentCount: {
      type: Number,
      default: 0,
    },
    views: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Post", postSchema);
