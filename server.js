import express, { json } from 'express';
import { config } from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
import lessonRoutes from './routes/lessonRoutes.js'; // 👈 ADD THIS LINE
import curriculumRoutes from './routes/curriculum.js';
import { v2 as cloudinary } from 'cloudinary';
import uploadRoutes from './routes/upload.js';

// Load environment variables from .env file
config();

// Configure Cloudinary if env vars are present
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// Connect to the database
connectDB();

const app = express();

// Middleware
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(json()); // Allow the server to accept JSON in the request body

// Define a simple route for the root URL
app.get('/', (req, res) => {
  res.send('API is running...');
});

// --- Mount Routers ---
// Use the auth routes for any requests to /api/auth
app.use('/api/auth', authRoutes);

// Use the lesson routes for any requests to /api/lessons
app.use('/api/lessons', lessonRoutes); // 👈 ADD THIS LINE

// Curriculum hierarchical routes
app.use('/api/curriculum', curriculumRoutes);

// Upload routes
app.use('/api/upload', uploadRoutes);


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));