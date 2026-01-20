// models/Knowledge.js
const mongoose = require("mongoose");

const knowledgeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String, // TipTap HTML
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Knowledge", knowledgeSchema);
