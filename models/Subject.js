import mongoose from 'mongoose';

const { Schema } = mongoose;

const SubjectSchema = new Schema({
  boardId: { type: Schema.Types.ObjectId, ref: 'Board', required: true },
  name: { type: String, required: true },
}, { timestamps: true });

SubjectSchema.index({ boardId: 1, name: 1 }, { unique: true });

export default mongoose.model('Subject', SubjectSchema);


