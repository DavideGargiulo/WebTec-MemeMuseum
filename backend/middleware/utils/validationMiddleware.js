import { validationResult } from "express-validator";

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