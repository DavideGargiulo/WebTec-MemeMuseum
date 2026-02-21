import { Router } from "express";
import { uploader } from "../data/local/multerStorage/uploader.js";
import { 
  createMeme, 
  getAllMemes, 
  deleteMeme, 
  voteMeme, 
  getMemeById, 
  getMemeOfTheDay, 
  searchMemes,
  searchTagsForAutocomplete
} from "../controllers/memeController.js";
import { protect, optionalProtect } from "../middleware/utils/authMiddleware.js";

const router = Router();

router.get('/', optionalProtect, getAllMemes);

router.get('/search', optionalProtect, searchMemes);

router.get('/meme-of-the-day', getMemeOfTheDay);

router.get('/tags/search', searchTagsForAutocomplete);

router.post('/create', protect, uploader.single("image"), createMeme);

router.get('/:id', optionalProtect, getMemeById);

router.delete('/:id', protect, deleteMeme);

router.post('/:id/vote', protect, voteMeme);

export default router;