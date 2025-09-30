import mongoose from 'mongoose';

const { Schema } = mongoose;

const ModuleSchema = new Schema({
  chapterId: { type: Schema.Types.ObjectId, ref: 'Chapter', required: true },
  title: { type: String, required: true },
  order: { type: Number, default: 1 },
}, { timestamps: true });

ModuleSchema.index({ chapterId: 1, title: 1 }, { unique: true });

export default mongoose.model('Module', ModuleSchema);


