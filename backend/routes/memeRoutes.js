import { Router } from "express";
import { uploader } from "../data/local/multerStorage/uploader.js";
import { 
  createMeme, 
  getAllMemes, 
  deleteMeme, 
  voteMeme, 
  getMemeById, 
  getMemeOfTheDay, 
  searchMemes 
} from "../controllers/memeController.js";
import { protect } from "../middleware/utils/authMiddleware.js";

const router = Router();

router.get('/', getAllMemes);

router.get('/search', searchMemes);

router.get('/meme-of-the-day', getMemeOfTheDay);

router.post('/create', protect, uploader.single("image"), createMeme);

router.get('/:id', getMemeById);

router.delete('/:id', protect, deleteMeme);

router.post('/:id/vote', protect, voteMeme);

export default router;