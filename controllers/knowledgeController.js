// controllers/knowledgeController.js
const mongoose = require("mongoose");
const Knowledge = require("../models/Knowledge");
const { cacheService, CACHE_TTL, CACHE_KEYS } = require('../services/cacheService');

// Get all knowledge articles with pagination and caching
const getAllKnowledge = async (req, res) => {
  try {
    const { cursor, id } = req.query;
    const limit = parseInt(req.query.limit) || 10;

    const cacheKey = `${CACHE_KEYS.KNOWLEDGE}:cursor:${cursor || "first"}:${id || "first"}:${limit}`;

    const cached = await cacheService.get(cacheKey);
    if (cached) {
      console.log("Knowledge list cache hit:", cacheKey);
      return res.json(cached);
    }

    console.log("Knowledge list cache miss:", cacheKey);

    let query = {};
    if (cursor && id) {
      query.$or = [
        { createdAt: { $lt: new Date(cursor) } },
        {
          createdAt: new Date(cursor),
          _id: { $lt: new mongoose.Types.ObjectId(id) },
        },
      ];
    }

    const knowledge = await Knowledge.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1);

    const hasMore = knowledge.length > limit;
    if (hasMore) knowledge.pop();

    const lastPost = knowledge[knowledge.length - 1];

    const response = {
      data: knowledge,
      nextCursor: lastPost?.createdAt || null,
      nextId: lastPost?._id || null,
      hasMore,
    };

    await cacheService.set(cacheKey, response, CACHE_TTL.MEDIUM);

    res.json(response);
  } catch (error) {
    console.error("getAllKnowledge error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get knowledge article by ID with caching
const getKnowledgeById = async (req, res) => {
  try {
    const cacheKey = `${CACHE_KEYS.KNOWLEDGE}:${req.params.id}`;

    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const knowledge = await Knowledge.findById(req.params.id);
    if (!knowledge) {
      return res.status(404).json({ message: "Knowledge article not found" });
    }

    await cacheService.set(cacheKey, knowledge, CACHE_TTL.LONG);

    res.json(knowledge);
  } catch (error) {
    console.error("getKnowledgeById error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Create knowledge article with cache invalidation
const createKnowledge = async (req, res) => {
  try {
    const knowledge = await Knowledge.create(req.body);

    // Invalidate knowledge cache
    await cacheService.clearPrefix(CACHE_KEYS.KNOWLEDGE);

    res.status(201).json(knowledge);
  } catch (error) {
    console.error("createKnowledge error:", error);
    res.status(400).json({ message: error.message });
  }
};

// Update knowledge article with cache invalidation
const updateKnowledge = async (req, res) => {
  try {
    const knowledge = await Knowledge.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!knowledge) {
      return res.status(404).json({ message: "Knowledge article not found" });
    }

    // Invalidate cache
    await cacheService.delete(`${CACHE_KEYS.KNOWLEDGE}:${req.params.id}`);
    await cacheService.clearPrefix(CACHE_KEYS.KNOWLEDGE);

    res.json(knowledge);
  } catch (error) {
    console.error("updateKnowledge error:", error);
    res.status(400).json({ message: error.message });
  }
};

// Delete knowledge article with cache invalidation
const deleteKnowledge = async (req, res) => {
  try {
    const knowledge = await Knowledge.findByIdAndDelete(req.params.id);

    if (!knowledge) {
      return res.status(404).json({ message: "Knowledge article not found" });
    }

    // Invalidate cache
    await cacheService.delete(`${CACHE_KEYS.KNOWLEDGE}:${req.params.id}`);
    await cacheService.clearPrefix(CACHE_KEYS.KNOWLEDGE);

    res.json({ message: "Knowledge article deleted successfully" });
  } catch (error) {
    console.error("deleteKnowledge error:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllKnowledge,
  getKnowledgeById,
  createKnowledge,
  updateKnowledge,
  deleteKnowledge
};

