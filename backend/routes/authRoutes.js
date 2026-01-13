import { Router } from "express";
import { login, logout, register } from "../controllers/authController.js";
import { validateResult } from "../middleware/utils/validationMiddleware.js"; 

const router = Router();

router.post("/login", validateResult, login);

router.post("/signup", validateResult, register);

router.post("/logout", logout);

export default router;