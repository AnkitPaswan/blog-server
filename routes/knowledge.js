// routes/knowledge.js
const express = require("express");
const router = express.Router();
const { getAllKnowledge, createKnowledge, getKnowledgeById, updateKnowledge, deleteKnowledge } = require('../controllers/knowledgeController');

router.get("/", getAllKnowledge);
router.get("/:id", getKnowledgeById);
router.post("/", createKnowledge);
router.put("/:id", updateKnowledge);
router.delete("/:id", deleteKnowledge);

module.exports = router;
