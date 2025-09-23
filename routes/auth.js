import express from 'express';
// Corrected the import to use named imports directly
import { registerUser, loginUser } from '../controllers/authController.js';

const router = express.Router();

// Route for user registration
router.post('/register', registerUser);

// Route for user login
router.post('/login', loginUser);

export default router;

