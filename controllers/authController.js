import User from '../models/User.js';
import jwt from 'jsonwebtoken';

// Helper function to generate a JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res) => {
  const { name, email, password, age, board = null, subject = null, chapter = null } = req.body;

  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      age,
      board,
      subject,
      chapter,
      // Show onboarding after signup until the learner completes selections
      onboardingCompleted: !!(board && subject),
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        board: user.board,
        subject: user.subject,
        chapter: user.chapter,
        onboardingCompleted: user.onboardingCompleted,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  // Basic validation to ensure inputs exist
  if (!email || !password) {
    return res.status(400).json({ message: 'Please provide an email and password' });
  }

  try {
    // Find user by email
    const user = await User.findOne({ email });

    // Check if user exists and then compare the password
    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        board: user.board,
        subject: user.subject,
        chapter: user.chapter,
        onboardingCompleted: user.onboardingCompleted,
        token: generateToken(user._id),
      });
    } else {
      // Use a generic error message for security
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error(error); // Log the actual error on the server for debugging
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get user data
// @route   GET /api/auth/user/:userId
// @access  Public (for simplicity) - ideally protect with auth middleware
export const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('name email board subject chapter onboardingCompleted');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      board: user.board,
      subject: user.subject,
      chapter: user.chapter,
      onboardingCompleted: user.onboardingCompleted,
    });
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};

// @desc    Update onboarding selections for a user
// @route   PUT /api/auth/onboarding
// @access  Public (for simplicity) - ideally protect with auth middleware
export const updateOnboarding = async (req, res) => {
  const { userId, board = null, subject = null, chapter = null } = req.body;
  if (!userId) {
    return res.status(400).json({ message: 'userId is required' });
  }
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    user.board = board;
    user.subject = subject;
    user.chapter = chapter;
    user.onboardingCompleted = !!(board && subject);
    await user.save();
    return res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      board: user.board,
      subject: user.subject,
      chapter: user.chapter,
      onboardingCompleted: user.onboardingCompleted,
    });
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};

// @desc    Get chapter progress for a user
// @route   GET /api/auth/progress/:userId
export const getProgress = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('chaptersProgress');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user.chaptersProgress || []);
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};

// @desc    Update chapter progress
// @route   PUT /api/auth/progress
export const updateProgress = async (req, res) => {
  const { userId, chapter, conceptCompleted, quizCompleted, lessonTitle, isCorrect } = req.body;
  if (!userId || !chapter) return res.status(400).json({ message: 'userId and chapter required' });
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const idx = user.chaptersProgress.findIndex((c) => c.chapter === Number(chapter));
    if (idx >= 0) {
      if (typeof conceptCompleted === 'boolean') user.chaptersProgress[idx].conceptCompleted = conceptCompleted;
      if (typeof quizCompleted === 'boolean') user.chaptersProgress[idx].quizCompleted = quizCompleted;
      if (lessonTitle && typeof isCorrect === 'boolean') {
        const stats = user.chaptersProgress[idx].stats || new Map();
        const current = stats.get(lessonTitle) || { correct: 0, wrong: 0, lastReviewedAt: null };
        if (isCorrect) current.correct += 1; else current.wrong += 1;
        current.lastReviewedAt = new Date();
        stats.set(lessonTitle, current);
        user.chaptersProgress[idx].stats = stats;
      }
      user.chaptersProgress[idx].updatedAt = new Date();
    } else {
      user.chaptersProgress.push({
        chapter: Number(chapter),
        conceptCompleted: !!conceptCompleted,
        quizCompleted: !!quizCompleted,
        stats: lessonTitle && typeof isCorrect === 'boolean' ? new Map([[lessonTitle, { correct: isCorrect ? 1 : 0, wrong: isCorrect ? 0 : 1, lastReviewedAt: new Date() }]]) : new Map(),
      });
    }
    await user.save();
    res.json(user.chaptersProgress);
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};

