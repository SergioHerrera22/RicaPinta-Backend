import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export const JWT_SECRET = process.env.JWT_SECRET;
export const JWT_EXPIRY_HOURS = parseInt(process.env.JWT_EXPIRY_HOURS || "24");

export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: `${JWT_EXPIRY_HOURS}h`,
  });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

export function decodeToken(token) {
  return jwt.decode(token);
}
