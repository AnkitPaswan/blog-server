const mongoose = require('mongoose');
const Post = require('../model/PostSchema');
const User = require('../model/UserSchema');
const bcrypt = require('bcryptjs');
const posts = require('../model/Post');

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb+srv://ankitpaswan192_db_user:reOonaJFGsmIEqLf@cluster0.tjigwtg.mongodb.net/blog');

    // Clear existing data
    await Post.deleteMany({});
    await User.deleteMany({});

    // Seed posts
    await Post.insertMany(posts);
    console.log('Posts seeded successfully');

    // Seed admin user
    const hashedPassword = await bcrypt.hash('password', 10);
    const adminUser = new User({
      username: 'admin',
      password: hashedPassword,
      role: 'admin'
    });
    await adminUser.save();
    console.log('Admin user seeded successfully');

    console.log('Database seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
