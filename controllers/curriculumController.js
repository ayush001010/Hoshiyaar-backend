import Board from '../models/Board.js';
import Subject from '../models/Subject.js';
import Chapter from '../models/Chapter.js';
import Module from '../models/Module.js';
import CurriculumItem from '../models/CurriculumItem.js';

// GET /api/curriculum/boards
export const listBoards = async (_req, res) => {
  try {
    const boards = await Board.find({}).sort({ name: 1 });
    return res.json(boards);
  } catch (err) {
    return res.status(500).json({ message: 'Server Error' });
  }
};

// GET /api/curriculum/subjects?board=CBSE
export const listSubjects = async (req, res) => {
  try {
    const { board = 'CBSE' } = req.query;
    const b = await Board.findOne({ name: board });
    if (!b) return res.json([]);
    const subjects = await Subject.find({ boardId: b._id }).sort({ name: 1 });
    return res.json(subjects);
  } catch (err) {
    return res.status(500).json({ message: 'Server Error' });
  }
};

// POST /api/curriculum/import
export const importCurriculum = async (req, res) => {
  try {
    const payload = req.body;
    if (!payload || !payload.module_title || !Array.isArray(payload.lessons)) {
      return res.status(400).json({ message: 'Invalid payload. Expect { module_title, lessons[] }' });
    }

    // Ensure base hierarchy (Board=CBSE, Subject=Science)
    const board = await Board.findOneAndUpdate(
      { name: 'CBSE' },
      { $setOnInsert: { name: 'CBSE' } },
      { upsert: true, new: true }
    );
    const subject = await Subject.findOneAndUpdate(
      { boardId: board._id, name: 'Science' },
      { $setOnInsert: { boardId: board._id, name: 'Science' } },
      { upsert: true, new: true }
    );

    // Chapter title from payload.module_title (your screenshot indicates chapter name)
    const chapter = await Chapter.findOneAndUpdate(
      { subjectId: subject._id, title: payload.module_title },
      { $setOnInsert: { subjectId: subject._id, title: payload.module_title, order: 1 } },
      { upsert: true, new: true }
    );

    // HARD OVERWRITE: remove existing modules and their items for this chapter
    const existingModules = await Module.find({ chapterId: chapter._id }).select('_id');
    if (existingModules.length > 0) {
      const ids = existingModules.map(m => m._id);
      await CurriculumItem.deleteMany({ moduleId: { $in: ids } });
      await Module.deleteMany({ _id: { $in: ids } });
    }

    // For each lesson in payload, create a module under the chapter
    let totalItems = 0;
    for (const [moduleOrder, lesson] of payload.lessons.entries()) {
      const module = await Module.create({ chapterId: chapter._id, title: lesson.lesson_title, order: moduleOrder + 1 });

      let order = 0;
      for (const c of (lesson.concepts || [])) {
        order += 1;
        const base = { moduleId: module._id, order, imageUrl: c.imageUrl || c.image || undefined, images: Array.isArray(c.images) ? c.images.filter(Boolean) : undefined };
        if (c.type === 'statement') {
          await CurriculumItem.create({ ...base, type: 'statement', text: c.text });
        } else if (c.type === 'multiple-choice') {
          await CurriculumItem.create({ ...base, type: 'multiple-choice', question: c.question, options: c.options || [], answer: c.answer });
        } else if (c.type === 'rearrange') {
          await CurriculumItem.create({ ...base, type: 'rearrange', question: c.question, words: c.words || [], answer: c.answer });
        }
        totalItems += 1;
      }
    }

    return res.status(201).json({ board: 'CBSE', subject: 'Science', chapter: chapter.title, importedItems: totalItems });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server Error' });
  }
};

// GET /api/curriculum/chapters?board=CBSE&subject=Science
export const listChapters = async (req, res) => {
  try {
    const { board = 'CBSE', subject = 'Science' } = req.query;
    const b = await Board.findOne({ name: board });
    if (!b) return res.json([]);
    const s = await Subject.findOne({ boardId: b._id, name: subject });
    if (!s) return res.json([]);
    const chapters = await Chapter.find({ subjectId: s._id }).sort({ order: 1 });
    return res.json(chapters);
  } catch (err) {
    return res.status(500).json({ message: 'Server Error' });
  }
};

// GET /api/curriculum/modules?chapterId=...
export const listModules = async (req, res) => {
  try {
    const { chapterId } = req.query;
    if (!chapterId) return res.status(400).json({ message: 'chapterId is required' });
    const modules = await Module.find({ chapterId }).sort({ order: 1 });
    return res.json(modules);
  } catch (err) {
    return res.status(500).json({ message: 'Server Error' });
  }
};

// GET /api/curriculum/items?moduleId=...
export const listItems = async (req, res) => {
  try {
    const { moduleId } = req.query;
    if (!moduleId) return res.status(400).json({ message: 'moduleId is required' });
    const items = await CurriculumItem.find({ moduleId }).sort({ order: 1 });
    return res.json(items);
  } catch (err) {
    return res.status(500).json({ message: 'Server Error' });
  }
};


// PUT /api/curriculum/items/:id/image
export const setItemImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { imageUrl, publicId, images, imagePublicIds, append } = req.body || {};
    if (!imageUrl && !Array.isArray(images)) return res.status(400).json({ message: 'imageUrl or images[] is required' });
    const update = {};
    if (imageUrl) { update.imageUrl = imageUrl; update.imagePublicId = publicId; }
    const shouldAppend = append === true || String(append).toLowerCase() === 'true';
    let item;
    if (Array.isArray(images) && shouldAppend) {
      item = await CurriculumItem.findByIdAndUpdate(
        id,
        { $push: { images: { $each: images.filter(Boolean) }, imagePublicIds: { $each: (imagePublicIds || []).filter(Boolean) } }, ...(imageUrl ? { $set: { imageUrl, imagePublicId: publicId } } : {}) },
        { new: true }
      );
    } else {
      if (Array.isArray(images)) { update.images = images; update.imagePublicIds = imagePublicIds || []; }
      item = await CurriculumItem.findByIdAndUpdate(id, update, { new: true });
    }
    if (!item) return res.status(404).json({ message: 'Item not found' });
    return res.json(item);
  } catch (err) {
    return res.status(500).json({ message: 'Server Error' });
  }
};


