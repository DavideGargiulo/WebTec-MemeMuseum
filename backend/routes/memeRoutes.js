import { Router } from "express";
import { uploader } from "../data/local/multerStorage/uploader.js";
import { createMeme } from "../controllers/memeController.js";
import { protect } from "../middleware/utils/authMiddleware.js";

const router = Router();

router.post("/create", protect, uploader.single("image"), createMeme);

export default router;