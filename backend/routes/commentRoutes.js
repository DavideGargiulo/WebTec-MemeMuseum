import express from 'express';
import { 
  getCommentsByMeme, 
  createComment,  
} from '../controllers/commentController.js';
import { protect } from '../middleware/utils/authMiddleware.js';

const router = express.Router();

router.get('/meme/:memeId', getCommentsByMeme);

router.post('/meme/:memeId', protect, createComment);

export default router;