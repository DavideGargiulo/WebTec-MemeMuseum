import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../data/remote/Database.js";

// ==========================================
// UTILITY: Token & Cookie
// ==========================================

const signToken = (id, username) => {
  return jwt.sign(
    { sub: id, username: username },
    process.env.JWT_SECRET || 'fallback-secret-per-dev', // Fallback per evitare crash
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user.id, user.username);

  // Calcoliamo i millisecondi (7 giorni di default)
  const expiresInDays = parseInt(process.env.JWT_COOKIE_EXPIRES_IN) || 7;
  const expiresInMs = expiresInDays * 24 * 60 * 60 * 1000;

  const cookieOptions = {
    // USARE maxAge RISOLVE IL PROBLEMA DEL TIME DRIFT DI DOCKER
    maxAge: expiresInMs, 
    httpOnly: true, // Sempre true per sicurezza
    
    // SU LOCALHOST (HTTP) QUESTI DEVONO ESSERE COSI':
    secure: process.env.NODE_ENV === 'production', // false in dev
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax' // lax in dev
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

// ==========================================
// CONTROLLERS
// ==========================================

export async function login(req, res) {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      return res.status(400).json({ message: "Email e password obbligatorie" });
    }

    // Cerchiamo l'utente (incluso passwordHash)
    const user = await User.findOne({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: "Credenziali errate" });
    }

    // Login ok -> Invio Cookie
    createSendToken(user, 200, res);

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({ message: "Errore interno server" });
  }
}

export async function logout(req, res) {
  res.cookie('jwt', 'loggedout', {
    maxAge: 1, // Scade subito
    httpOnly: true
  });
  res.status(200).json({ status: 'success' });
}