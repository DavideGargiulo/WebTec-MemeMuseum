import { Router } from "express";
import { login, logout } from "../controllers/authController.js";
import { validateResult } from "../middleware/utils/validationMiddleware.js"; 

const router = Router();

router.post("/login", validateResult, login);

router.post("/logout", logout);

export default router;