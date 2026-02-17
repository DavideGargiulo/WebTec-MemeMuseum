import { Router } from "express";
import { uploader } from "../data/local/multerStorage/uploader.js";
import { createMeme, getAllMemes, deleteMeme, voteMeme } from "../controllers/memeController.js";
import { protect } from "../middleware/utils/authMiddleware.js";

const router = Router();

router.post("/create", protect, uploader.single("image"), createMeme);

router.get("/", getAllMemes);

router.delete('/:id', protect, deleteMeme);

router.post('/:id/vote', protect, voteMeme);

export default router;