import jwt from "jsonwebtoken";
import { promisify } from "util";
import { User } from "../../data/remote/Database.js";

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

    const currentUser = await User.findByPk(decoded.sub); // 'sub' era l'ID nel tuo signToken
    
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