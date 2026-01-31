const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const connectDB = require("./config/database");
const redisClient = require("./config/redis");
const { apiRateLimiter, authRateLimiter } = require("./middleware/rateLimit");
const postRoutes = require("./routes/postRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const commentRoutes = require("./routes/commentRoutes");
const authRoutes = require("./routes/authRoutes");
const knowledgeRoutes = require("./routes/knowledge");

const app = express();
const PORT = process.env.PORT || 5001;

// Connect to MongoDB
connectDB();

// Initialize Redis connection
const initializeRedis = async () => {
  try {
    await redisClient.connect();
    console.log("Redis initialization successful");
  } catch (error) {
    console.error("Failed to initialize Redis:", error.message);
    console.log("Continuing without Redis - some features may be limited");
  }
};

initializeRedis();

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://blogs-ivory-five.vercel.app",
    ],
    credentials: true,
  })
);
app.use(bodyParser.json());

// Rate limiting middleware (only applied if Redis is available)
app.use(apiRateLimiter);

// Health check endpoint
app.get("/health", async (req, res) => {
  const redisStatus = redisClient.getStatus();
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    redis: {
      connected: redisStatus.isConnected,
      retryAttempts: redisStatus.retryAttempts,
    },
  });
});

// Routes
app.use("/api/auth", authRateLimiter, authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/knowledges", knowledgeRoutes);

// Default route
app.get("/", (req, res) => {
  res.send("Blog Backend API");
});

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  console.log(`${signal} received. Starting graceful shutdown...`);

  try {
    // Close Redis connection
    await redisClient.disconnect();
    console.log("Redis connection closed");
  } catch (error) {
    console.error("Error closing Redis connection:", error.message);
  }

  // Close the server
  process.exit(0);
};

// Register shutdown handlers
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
