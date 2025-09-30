import express from 'express';
import { importCurriculum, listBoards, listSubjects, listChapters, listModules, listItems, setItemImage } from '../controllers/curriculumController.js';

const router = express.Router();

router.post('/import', importCurriculum);
router.get('/boards', listBoards);
router.get('/subjects', listSubjects);
router.get('/chapters', listChapters);
router.get('/modules', listModules);
router.get('/items', listItems);
router.put('/items/:id/image', setItemImage);

export default router;


