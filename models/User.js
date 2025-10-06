import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    age: {
      type: Number,
      required: true,
    },
    // Onboarding selections
  boardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', default: null },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClassLevel', default: null },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null },
  chapterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chapter', default: null },
  // Deprecated name-based fields kept for backward compatibility with older clients
    board: {
      type: String,
      default: null,
      trim: true,
    },
    subject: {
      type: String,
      default: null,
      trim: true,
    },
    chapter: {
      type: String,
      default: null,
      trim: true,
    },
    onboardingCompleted: {
      type: Boolean,
      default: false,
    },
    chaptersProgress: {
      type: [
        new mongoose.Schema(
          {
            chapter: { type: Number, required: true },
            conceptCompleted: { type: Boolean, default: false },
            quizCompleted: { type: Boolean, default: false },
            // Per-lesson stats keyed by lesson title
            stats: {
              type: Map,
              of: new mongoose.Schema(
                {
                  correct: { type: Number, default: 0 },
                  wrong: { type: Number, default: 0 },
                  lastReviewedAt: { type: Date, default: null },
                },
                { _id: false }
              ),
              default: {},
            },
            updatedAt: { type: Date, default: Date.now },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Method to compare entered password with the hashed password in the database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Middleware to hash password before saving a new user
userSchema.pre('save', async function (next) {
  // Only run this function if password was modified (or is new)
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

const User = mongoose.model('User', userSchema);

export default User;

