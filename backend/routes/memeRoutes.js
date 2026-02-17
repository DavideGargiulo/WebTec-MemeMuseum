import { Router } from "express";
import { uploader } from "../data/local/multerStorage/uploader.js";
import { createMeme, getAllMemes, deleteMeme } from "../controllers/memeController.js";
import { protect } from "../middleware/utils/authMiddleware.js";

const router = Router();

router.post("/create", protect, uploader.single("image"), createMeme);

router.get("/", getAllMemes);

router.delete('/:id', protect, deleteMeme);

export default router;