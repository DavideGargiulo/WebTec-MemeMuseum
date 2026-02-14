import { Router } from "express";
import { body } from "express-validator"; 
import { login, logout, register, getMe } from "../controllers/authController.js";
import { validateResult } from "../middleware/utils/validationMiddleware.js"; 
import { protect } from "../middleware/utils/authMiddleware.js";

const router = Router();

router.post("/login", 
  [
    body('email')
      .trim()
      .isEmail().withMessage("Email non valida")
      .normalizeEmail()
      .escape(),
    
    body('password')
      .trim()
      .notEmpty().withMessage("Password obbligatoria")
      .isLength({ min: 6, max: 128 }).withMessage("Password tra 6 e 128 caratteri")
  ],
  validateResult,
  login
);

router.post("/signup", 
  [
    body('username')
      .trim()
      .notEmpty().withMessage("Username obbligatorio")
      .isLength({ min: 3, max: 30 }).withMessage("Username tra 3 e 30 caratteri")
      .matches(/^[a-zA-Z0-9_-]+$/).withMessage("Username può contenere solo lettere, numeri, _ e -")
      .escape(),

    body('email')
      .trim()
      .isEmail().withMessage("Email non valida")
      .normalizeEmail()
      .escape(),

    body('password')
      .trim()
      .notEmpty().withMessage("Password obbligatoria")
      .isLength({ min: 6, max: 128 }).withMessage("Password tra 6 e 128 caratteri")
  ],
  validateResult,
  register
);

router.post("/logout", logout);

router.get('/me', protect, getMe);

export default router;