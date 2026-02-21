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

/**
 * @route GET /
 * @description Recupera il feed generale con tutti i meme.
 * @access Pubblico (Soft Protection: se loggato, include i voti assegnati dall'utente)
 * @middleware optionalProtect - Tenta di autenticare l'utente senza bloccare gli ospiti.
 */
router.get('/', optionalProtect, getAllMemes);

/**
 * @route GET /search
 * @description Ricerca avanzata e paginata dei meme (per data, tag, ordinamento).
 * @access Pubblico (Soft Protection: include i voti se loggato)
 * @middleware optionalProtect - Tenta di autenticare l'utente.
 */
router.get('/search', optionalProtect, searchMemes);

/**
 * @route GET /meme-of-the-day
 * @description Calcola e restituisce il meme con il punteggio più alto della giornata odierna.
 * @access Pubblico
 */
router.get('/meme-of-the-day', getMemeOfTheDay);

/**
 * @route GET /tags/search
 * @description Cerca i tag nel database che corrispondono a una determinata query (per autocomplete).
 * @access Pubblico
 */
router.get('/tags/search', searchTagsForAutocomplete);

/**
 * @route POST /create
 * @description Crea un nuovo meme caricando l'immagine sul server e salvando i dati nel DB.
 * @access Privato (Richiede JWT valido)
 * @middleware protect - Verifica l'autenticazione.
 * @middleware uploader.single("image") - Intercetta l'upload del file form-data limitando formato e dimensioni.
 */
router.post('/create', protect, uploader.single("image"), createMeme);

/**
 * @route GET /:id
 * @description Recupera i dettagli di un singolo meme tramite il suo ID (inclusi tag e commenti).
 * @access Pubblico (Soft Protection: include il voto dell'utente se loggato)
 * @middleware optionalProtect - Tenta di autenticare l'utente.
 */
router.get('/:id', optionalProtect, getMemeById);

/**
 * @route DELETE /:id
 * @description Elimina un meme esistente (sia dal DB che dal file system). Solo il proprietario può farlo.
 * @access Privato (Richiede JWT valido)
 * @middleware protect - Verifica l'autenticazione.
 */
router.delete('/:id', protect, deleteMeme);

/**
 * @route POST /:id/vote
 * @description Inserisce, modifica o rimuove un voto (upvote/downvote) per un meme specifico.
 * @access Privato (Richiede JWT valido)
 * @middleware protect - Verifica l'autenticazione.
 */
router.post('/:id/vote', protect, voteMeme);

export default router;