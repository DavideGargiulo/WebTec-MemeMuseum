import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../data/remote/Database.js";

/**
 * Genera un JSON Web Token (JWT) per un utente specifico.
 * @param {string|number} id - L'ID univoco dell'utente nel database.
 * @param {string} username - L'username dell'utente.
 * @returns {string} Il token JWT firmato.
 */
const signToken = (id, username) => {
  return jwt.sign(
    { sub: id, username: username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
};

/**
 * Crea un JWT, lo imposta come cookie HTTP-only nella risposta e invia i dati dell'utente.
 * @param {Object} user - L'oggetto utente recuperato o creato dal database.
 * @param {number} statusCode - Il codice di stato HTTP da restituire (es. 200, 201).
 * @param {Object} res - L'oggetto di risposta di Express.
 * @returns {void} Invia direttamente la risposta HTTP, non ritorna valori.
 */
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user.id, user.username);

  const expiresInDays = parseInt(process.env.JWT_COOKIE_EXPIRES_IN) || 7;
  const expiresInMs = expiresInDays * 24 * 60 * 60 * 1000;

  const cookieOptions = {
    maxAge: expiresInMs, 
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
  };

  res.cookie('jwt', token, cookieOptions);

  user.passwordHash = undefined;

  res.status(statusCode).json({
    status: 'success',
    data: {
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    }
  });
};

/**
 * Gestisce l'autenticazione di un utente esistente.
 * Verifica le credenziali e, in caso di successo, invia un cookie con il JWT.
 * @param {Object} req - L'oggetto di richiesta di Express (contiene email e password in req.body).
 * @param {Object} res - L'oggetto di risposta di Express.
 * @returns {Promise<Object>} Una Promise che risolve con la risposta JSON (successo o errore).
 */
export async function login(req, res) {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      return res.status(400).json({ message: "Email e password obbligatorie" });
    }

    const user = await User.findOne({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: "Credenziali errate" });
    }

    createSendToken(user, 200, res);
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({ message: "Errore interno server" });
  }
}

/**
 * Gestisce la registrazione di un nuovo utente.
 * Verifica che email e username non siano già in uso, esegue l'hashing della password e crea l'utente.
 * @param {Object} req - L'oggetto di richiesta di Express (contiene username, email e password in req.body).
 * @param {Object} res - L'oggetto di risposta di Express.
 * @returns {Promise<Object>} Una Promise che risolve con la risposta JSON (nuovo utente o errore).
 */
export async function register(req, res) {
  try {
    const { username, email, password } = req.body;
    
    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      return res.status(409).json({ message: "Questa email è già registrata" });
    }

    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(409).json({ message: "Questo username è già in uso" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      username,
      email,
      passwordHash: hashedPassword
    });

    createSendToken(newUser, 201, res);
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({ message: "Errore durante la registrazione" });
  }
}

/**
 * Disconnette l'utente sovrascrivendo il cookie JWT esistente con uno che scade immediatamente.
 * @param {Object} req - L'oggetto di richiesta di Express.
 * @param {Object} res - L'oggetto di risposta di Express.
 * @returns {Promise<Object>} Una Promise che risolve con lo status di successo.
 */
export async function logout(req, res) {
  res.cookie('jwt', 'loggedout', {
    maxAge: 1,
    httpOnly: true
  });
  res.status(200).json({ status: 'success' });
}

/**
 * Restituisce i dati del profilo dell'utente attualmente autenticato.
 * Presuppone che un middleware precedente abbia verificato il token e popolato `req.user`.
 * @param {Object} req - L'oggetto di richiesta di Express (deve contenere req.user).
 * @param {Object} res - L'oggetto di risposta di Express.
 * @returns {Promise<Object>} Una Promise che risolve con i dati dell'utente loggato.
 */
export async function getMe(req, res) {
  res.status(200).json({
    status: 'success',
    data: {
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
      }
    }
  });
}