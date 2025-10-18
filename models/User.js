import mongoose from 'mongoose';

const userSchema = mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
    },
    // Email is optional now; login is done via username
    email: {
      type: String,
      default: null,
      unique: false,
      sparse: true, // Only index non-null values
      trim: true,
    },
    age: {
      type: Number,
      required: true,
    },
    dateOfBirth: {
      type: Date,
      required: true,
    },
    classLevel: {
      type: String,
      default: null,
      trim: true,
    },
    phone: {
      type: String,
      default: null,
      trim: true,
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
                  bestScore: { type: Number, default: 0 },
                  lastScore: { type: Number, default: 0 },
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

// Method to compare entered date of birth with the stored date of birth
userSchema.methods.matchDateOfBirth = async function (enteredDateOfBirth) {
  // Convert both dates to ISO string format for comparison
  const storedDate = this.dateOfBirth.toISOString().split('T')[0]; // YYYY-MM-DD format
  const enteredDate = new Date(enteredDateOfBirth).toISOString().split('T')[0];
  return storedDate === enteredDate;
};

const User = mongoose.model('User', userSchema);

export default User;

