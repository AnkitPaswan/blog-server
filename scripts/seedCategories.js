const mongoose = require('mongoose');
const Category = require('../model/CategorySchema');
const connectDB = require('../config/database');

const seedCategories = async () => {
  try {
    await connectDB();

    // Check if categories already exist
    const existingCategories = await Category.find();
    if (existingCategories.length > 0) {
      console.log('Categories already exist. Skipping seeding.');
      return;
    }

    const categories = [
      { name: 'Sports', description: 'Sports news and updates' },
      { name: 'Technology', description: 'Latest tech news and innovations' },
      { name: 'Entertainment', description: 'Movies, music, and entertainment news' },
      { name: 'Lifestyle', description: 'Lifestyle tips and trends' },
      { name: 'News', description: 'General news and current events' },
      { name: 'Education', description: 'Educational content and resources' },
      { name: 'Art', description: 'Art and creative expressions' },
    ];

    await Category.insertMany(categories);
    console.log('Categories seeded successfully!');
  } catch (error) {
    console.error('Error seeding categories:', error);
  } finally {
    mongoose.connection.close();
  }
};

seedCategories();
