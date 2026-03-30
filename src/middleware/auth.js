import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/jwt.js";

export function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        ok: false,
        message: "Token no proporcionado",
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      ok: false,
      message: "Token invalido o expirado",
    });
  }
}

export function roleMiddleware(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        message: "No autenticado",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        ok: false,
        message: "Permiso insuficiente",
      });
    }

    next();
  };
}

export function errorHandler(err, req, res, next) {
  console.error("Error:", err);

  if (err.message.includes("not found")) {
    return res.status(404).json({
      ok: false,
      message: err.message,
    });
  }

  if (err.message.includes("Stock insuficiente")) {
    return res.status(400).json({
      ok: false,
      message: err.message,
    });
  }

  res.status(500).json({
    ok: false,
    message:
      process.env.NODE_ENV === "production" ? "Error interno" : err.message,
  });
}
