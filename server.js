import express, { json } from 'express';
import { config } from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';

// Load environment variables from .env file
config();

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

// Use the auth routes for any requests to /api/auth
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

