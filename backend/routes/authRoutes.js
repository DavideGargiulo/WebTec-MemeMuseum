import { Router } from "express";
import { body } from "express-validator"; 
import { login, logout, register, getMe } from "../controllers/authController.js";
import { validateResult } from "../middleware/utils/validationMiddleware.js"; 
import { protect } from "../middleware/utils/authMiddleware.js";

/**
 * Router di Express dedicato all'autenticazione degli utenti.
 * Gestisce la registrazione, il login, il logout e il recupero del profilo corrente.
 * @module routes/authRoutes
 */
const router = Router();

/**
 * @route POST /login
 * @description Autentica un utente esistente e restituisce un cookie con il JWT.
 * @access Pubblico
 * @middleware express-validator - Sanitizza e valida l'email e la password.
 * @middleware validateResult - Intercetta eventuali errori di validazione prima di passare al controller.
 */
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

/**
 * @route POST /signup
 * @description Registra un nuovo utente nel sistema e lo logga automaticamente (invia cookie JWT).
 * @access Pubblico
 * @middleware express-validator - Controlla la lunghezza e i caratteri speciali dell'username, valida l'email e la password.
 * @middleware validateResult - Blocca la richiesta se la validazione fallisce.
 */
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

/**
 * @route POST /logout
 * @description Disconnette l'utente sovrascrivendo e invalidando il cookie JWT corrente.
 * @access Pubblico (non serve essere protetta in modo rigido, basta svuotare il cookie)
 */
router.post("/logout", logout);

/**
 * @route GET /me
 * @description Restituisce i dati del profilo dell'utente attualmente loggato.
 * @access Privato (Richiede un JWT valido nei cookie o negli header)
 * @middleware protect - Verifica l'autenticazione prima di far accedere al controller.
 */
router.get('/me', protect, getMe);

export default router;