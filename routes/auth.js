import express from 'express';
// Corrected the import to use named imports directly
import { registerUser, loginUser, updateOnboarding, getUser, getProgress, updateProgress } from '../controllers/authController.js';

const router = express.Router();

// Route for user registration
router.post('/register', registerUser);

// Route for user login
router.post('/login', loginUser);

// Route to update onboarding selections
router.put('/onboarding', updateOnboarding);

// Route to get user data
router.get('/user/:userId', getUser);

// Progress routes
router.get('/progress/:userId', getProgress);
router.put('/progress', updateProgress);

export default router;

