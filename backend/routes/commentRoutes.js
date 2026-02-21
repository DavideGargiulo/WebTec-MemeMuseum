import express from 'express';
import { 
  getCommentsByMeme, 
  createComment,  
} from '../controllers/commentController.js';
import { protect } from '../middleware/utils/authMiddleware.js';

const router = express.Router();

/**
 * @route GET /meme/:memeId
 * @description Recupera la lista dei commenti principali associati a un meme specifico.
 * @access Pubblico (Chiunque può leggere i commenti)
 */
router.get('/meme/:memeId', getCommentsByMeme);

/**
 * @route POST /meme/:memeId
 * @description Aggiunge un nuovo commento a un meme specifico.
 * @access Privato (Richiede un JWT valido nei cookie o negli header)
 * @middleware protect - Verifica che l'utente sia autenticato prima di permettere la creazione del commento.
 */
router.post('/meme/:memeId', protect, createComment);

export default router;