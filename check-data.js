import mongoose from 'mongoose';
import Board from './models/Board.js';
import Subject from './models/Subject.js';
import Chapter from './models/Chapter.js';
import Unit from './models/Unit.js';
import Module from './models/Module.js';

mongoose.connect('mongodb://localhost:27017/hoshiyaar')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    const boards = await Board.find({});
    console.log('Boards:', boards.map(b => b.name));
    
    const subjects = await Subject.find({});
    console.log('Subjects:', subjects.map(s => s.name));
    
    const chapters = await Chapter.find({});
    console.log('Chapters:', chapters.map(c => c.title));
    
    const units = await Unit.find({});
    console.log('Units:', units.map(u => u.title));
    
    const modules = await Module.find({});
    console.log('Modules:', modules.map(m => m.title));
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
