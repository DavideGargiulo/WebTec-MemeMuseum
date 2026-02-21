import jwt from "jsonwebtoken";
import { promisify } from "util";
import { User } from "../../data/remote/Database.js";

/**
 * Middleware di autenticazione rigorosa (Strict Protection).
 * Verifica la presenza e la validità del token JWT nei cookie o nell'header di autorizzazione.
 * Se il token è valido e l'utente esiste, popola `req.user` e permette di proseguire.
 * Se manca, è scaduto o l'utente è stato eliminato, blocca la richiesta con un errore 401.
 * @param {Object} req - L'oggetto di richiesta di Express.
 * @param {Object} req.cookies - I cookie parsati dalla richiesta.
 * @param {Object} req.headers - Gli header della richiesta HTTP.
 * @param {Object} res - L'oggetto di risposta di Express.
 * @param {Function} next - Funzione di callback per passare il controllo al middleware/controller successivo.
 * @returns {Promise<void|Object>} Passa al prossimo middleware o restituisce una risposta JSON con errore 401.
 */
export const protect = async (req, res, next) => {
  try {
    let token;
    
    if (req.cookies.jwt) {
      token = req.cookies.jwt;
    } 
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: "Non sei loggato! Effettua il login per accedere." });
    }

    const secret = process.env.JWT_SECRET || 'fallback-secret-per-dev';
    const decoded = await promisify(jwt.verify)(token, secret);

    const currentUser = await User.findByPk(decoded.sub);
    
    if (!currentUser) {
      return res.status(401).json({ message: "L'utente appartenente a questo token non esiste più." });
    }
    req.user = currentUser;
    next();

  } catch (err) {
    console.error("JWT Verification Error:", err);
    res.cookie('jwt', 'loggedout', { maxAge: 1, httpOnly: true });
    return res.status(401).json({ message: "Token non valido o scaduto." });
  }
};

/**
 * Middleware di autenticazione opzionale (Soft Protection).
 * Controlla se l'utente ha un token nei cookie. Se lo ha ed è valido, popola `req.user`.
 * Se non lo ha, è scaduto o non è valido, ignora silenziosamente l'errore e permette 
 * comunque di proseguire come utente "ospite" (non autenticato).
 * Utile per rotte pubbliche che mostrano dati extra se l'utente è loggato (es. feed dei meme con i voti personali).
 * @param {Object} req - L'oggetto di richiesta di Express.
 * @param {Object} [req.cookies] - I cookie parsati dalla richiesta (può contenere il jwt).
 * @param {Object} res - L'oggetto di risposta di Express.
 * @param {Function} next - Funzione di callback per passare il controllo al middleware/controller successivo.
 * @returns {Promise<void>} Chiama sempre next(), indipendentemente dall'esito della verifica.
 */
export async function optionalProtect(req, res, next) {
  try {
    const token = req.cookies?.jwt;
    if (!token || token === 'loggedout') return next();

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-per-dev');
    const user = await User.findByPk(decoded.sub);
    if (user) req.user = user;
  } catch (_) { /* token invalido, ignoriamo */ }
  next();
}