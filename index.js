const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const connectDB = require('./config/database');
const postRoutes = require('./controller/postController');
const categoryRoutes = require('./controller/categoryController');
const { router: authRoutes } = require('./controller/authController');

const app = express();
const PORT = process.env.PORT || 5001;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(bodyParser.json());

// Routes
app.use('/api/posts', postRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/auth', authRoutes);

// Default route
app.get('/', (req, res) => {
  res.send('Blog Backend API');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
