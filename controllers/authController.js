import User from '../models/User.js';
import Board from '../models/Board.js';
import ClassLevel from '../models/ClassLevel.js';
import Subject from '../models/Subject.js';
import Chapter from '../models/Chapter.js';
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
  const { username, name, email = null, password, age, dateOfBirth = null, classLevel = null, board = null, classTitle = null, subject = null, chapter = null } = req.body;

  try {
    // Ensure unique username
    const userExists = await User.findOne({ username });

    if (userExists) {
      return res.status(400).json({ message: 'Username already taken' });
    }

    // Resolve IDs if names provided
    let boardDoc = null, classDoc = null, subjectDoc = null, chapterDoc = null;
    if (board) boardDoc = await Board.findOne({ name: board });
    if (classTitle) classDoc = await ClassLevel.findOne({ name: String(classTitle) });
    if (boardDoc && classDoc && subject) subjectDoc = await Subject.findOne({ boardId: boardDoc._id, classId: classDoc._id, name: subject });
    if (subjectDoc && chapter) chapterDoc = await Chapter.findOne({ subjectId: subjectDoc._id, title: chapter });

    const user = await User.create({
      username,
      name,
      email,
      password,
      age,
      dateOfBirth,
      classLevel,
      board,
      subject,
      chapter,
      boardId: boardDoc ? boardDoc._id : null,
      classId: classDoc ? classDoc._id : null,
      subjectId: subjectDoc ? subjectDoc._id : null,
      chapterId: chapterDoc ? chapterDoc._id : null,
      // Show onboarding after signup until the learner completes selections
      // Mark onboarding complete if we have BOTH a board and a subject (string or resolved doc)
      onboardingCompleted: !!((board || boardDoc) && (subject || subjectDoc)),
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        username: user.username,
        name: user.name,
        email: user.email,
        age: user.age,
        dateOfBirth: user.dateOfBirth,
        classLevel: user.classLevel,
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
  const { username, password } = req.body;

  // Basic validation to ensure inputs exist
  if (!username || !password) {
    return res.status(400).json({ message: 'Please provide a username and password' });
  }

  try {
    // Find user by username
    const user = await User.findOne({ username });

    // Check if user exists and then compare the password
    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        username: user.username,
        name: user.name,
        email: user.email,
        age: user.age,
        dateOfBirth: user.dateOfBirth,
        classLevel: user.classLevel,
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
    const user = await User.findById(req.params.userId).select('username name email phone age dateOfBirth classLevel board subject chapter onboardingCompleted boardId classId subjectId chapterId');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      _id: user._id,
      username: user.username,
      name: user.name,
      email: user.email,
      phone: user.phone,
      age: user.age,
      dateOfBirth: user.dateOfBirth,
      classLevel: user.classLevel,
      board: user.board,
      subject: user.subject,
      chapter: user.chapter,
        onboardingCompleted: user.onboardingCompleted,
        boardId: user.boardId,
        classId: user.classId,
        subjectId: user.subjectId,
        chapterId: user.chapterId,
    });
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};

// @desc    Update onboarding selections for a user
// @route   PUT /api/auth/onboarding
// @access  Public (for simplicity) - ideally protect with auth middleware
export const updateOnboarding = async (req, res) => {
  const { userId, board = null, subject = null, chapter = null, name = null, phone = null, classLevel = null, dateOfBirth = null, email = null } = req.body;
  if (!userId) {
    return res.status(400).json({ message: 'userId is required' });
  }
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (board !== null) user.board = board;
    if (subject !== null) user.subject = subject;
    if (chapter !== null) user.chapter = chapter;
    if (name !== null) user.name = name;
    if (phone !== null) user.phone = phone;
    if (classLevel !== null) user.classLevel = classLevel;
    if (dateOfBirth !== null) {
      const parsed = dateOfBirth ? new Date(dateOfBirth) : null;
      if (parsed && isNaN(parsed.getTime())) {
        return res.status(400).json({ message: 'Invalid dateOfBirth format. Use YYYY-MM-DD.' });
      }
      user.dateOfBirth = parsed;
    }
    if (email !== null) user.email = email;
    // Resolve and persist normalized IDs based on current string selections
    try {
      let boardDoc = null, classDoc = null, subjectDoc = null, chapterDoc = null;
      if (user.board) boardDoc = await Board.findOne({ name: user.board });
      // classLevel may be numeric or string; ClassLevel.name is stored as string
      if (user.classLevel || user.classId) classDoc = await ClassLevel.findOne({ name: String(user.classLevel || '') });
      if (boardDoc && classDoc && user.subject) subjectDoc = await Subject.findOne({ boardId: boardDoc._id, classId: classDoc._id, name: user.subject });
      if (subjectDoc && user.chapter) chapterDoc = await Chapter.findOne({ subjectId: subjectDoc._id, title: user.chapter });
      user.boardId = boardDoc ? boardDoc._id : null;
      user.classId = classDoc ? classDoc._id : null;
      user.subjectId = subjectDoc ? subjectDoc._id : null;
      user.chapterId = chapterDoc ? chapterDoc._id : null;
      // Only flip onboardingCompleted to true if both selections exist
      user.onboardingCompleted = !!((user.board || boardDoc) && (user.subject || subjectDoc));
    } catch (e) {
      // Do not fail the request if resolution fails; keep strings and continue
    }
    await user.save();
    return res.json({
      _id: user._id,
      username: user.username,
      name: user.name,
      email: user.email,
      age: user.age,
      dateOfBirth: user.dateOfBirth,
      classLevel: user.classLevel,
      phone: user.phone,
      board: user.board,
      subject: user.subject,
      chapter: user.chapter,
      onboardingCompleted: user.onboardingCompleted,
      boardId: user.boardId,
      classId: user.classId,
      subjectId: user.subjectId,
      chapterId: user.chapterId,
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

// @desc    Check if a username is available
// @route   GET /api/auth/check-username?username=foo
// @access  Public
export const checkUsername = async (req, res) => {
  try {
    const username = (req.query.username || '').trim();
    if (!username) {
      return res.status(400).json({ message: 'username is required', available: false });
    }
    const exists = await User.exists({ username });
    return res.json({ available: !exists });
  } catch (error) {
    return res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};

