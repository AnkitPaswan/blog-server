const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      required: true,
      unique: true,
    },
    user: {
      type: String,
      required: true,
    },
    handle: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    caption: {
      type: String,
      default: "",
    },
    date: {
      type: String,
      required: true,
    },
    likes: {
      type: Number,
      default: 0,
    },
    comments: {
      type: Number,
      default: 0,
    },
    retweets: {
      type: Number,
      default: 0,
    },
    tag: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Post", postSchema);
