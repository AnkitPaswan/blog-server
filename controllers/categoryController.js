const Category = require('../models/CategorySchema');
const { cacheService, CACHE_TTL, CACHE_KEYS } = require('../services/cacheService');

// Get all categories with caching
const getAllCategories = async (req, res) => {
  try {
    const cacheKey = CACHE_KEYS.CATEGORIES;
    
    // Try to get from cache first
    const cachedCategories = await cacheService.get(cacheKey);
    if (cachedCategories) {
      return res.json(cachedCategories);
    }

    // Cache miss, fetch from database
    const categories = await Category.find().sort({ createdAt: -1 });
    
    // Store in cache
    await cacheService.set(cacheKey, categories, CACHE_TTL.VERY_LONG);
    
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get category by ID with caching
const getCategoryById = async (req, res) => {
  try {
    const cacheKey = `${CACHE_KEYS.CATEGORIES}:${req.params.id}`;
    
    // Try to get from cache first
    const cachedCategory = await cacheService.get(cacheKey);
    if (cachedCategory) {
      return res.json(cachedCategory);
    }

    // Cache miss, fetch from database
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });
    
    // Store in cache
    await cacheService.set(cacheKey, category, CACHE_TTL.LONG);
    
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create new category (with cache invalidation)
const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    // Check if category already exists
    const existingCategory = await Category.findOne({ name: new RegExp(`^${name}$`, 'i') });
    if (existingCategory) {
      return res.status(400).json({ message: 'Category already exists' });
    }

    const newCategory = new Category({
      name,
      description
    });

    const savedCategory = await newCategory.save();
    
    // Invalidate categories cache
    await cacheService.delete(CACHE_KEYS.CATEGORIES);
    
    res.status(201).json(savedCategory);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update category (with cache invalidation)
const updateCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    // Check if another category with the same name exists
    const existingCategory = await Category.findOne({
      name: new RegExp(`^${name}$`, 'i'),
      _id: { $ne: req.params.id }
    });
    if (existingCategory) {
      return res.status(400).json({ message: 'Category name already exists' });
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      req.params.id,
      { name, description },
      { new: true }
    );

    if (!updatedCategory) return res.status(404).json({ message: 'Category not found' });
    
    // Invalidate categories cache
    await cacheService.delete(CACHE_KEYS.CATEGORIES);
    await cacheService.delete(`${CACHE_KEYS.CATEGORIES}:${req.params.id}`);
    
    res.json(updatedCategory);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete category (with cache invalidation)
const deleteCategory = async (req, res) => {
  try {
    const deletedCategory = await Category.findByIdAndDelete(req.params.id);
    if (!deletedCategory) return res.status(404).json({ message: 'Category not found' });
    
    // Invalidate categories cache
    await cacheService.delete(CACHE_KEYS.CATEGORIES);
    await cacheService.delete(`${CACHE_KEYS.CATEGORIES}:${req.params.id}`);
    
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
};

