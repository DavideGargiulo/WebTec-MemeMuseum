import { validationResult } from "express-validator";

/**
 * Middleware universale per la gestione degli errori di validazione.
 * Cattura i risultati dei controlli effettuati dai middleware di `express-validator` 
 * (che precedono questo nella rotta) e verifica se ci sono errori.
 * Se ci sono errori di validazione (es. campi vuoti, formati errati), 
 * blocca la richiesta e restituisce un errore 400 con i dettagli.
 * Se i dati sono validi, passa il controllo al controller successivo.
 * * @example
 * Utilizzo tipico in una rotta:
 * router.post('/login', [
 * body('email').isEmail(),
 * body('password').notEmpty()
 * ], validateResult, loginController);
 * @param {Object} req - L'oggetto di richiesta di Express.
 * @param {Object} res - L'oggetto di risposta di Express.
 * @param {Function} next - Funzione di callback per passare il controllo al controller successivo.
 * @returns {Object|void} Restituisce una risposta JSON con status 400 se ci sono errori, altrimenti chiama `next()`.
 */
export const validateResult = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      message: "Dati di input non validi",
      errors: errors.array() 
    });
  }
  
  next();
};