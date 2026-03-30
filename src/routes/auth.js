import express from "express";
import { query } from "../config/database.js";
import { generateToken } from "../config/jwt.js";
import bcrypt from "bcryptjs";

const router = express.Router();

router.post("/login", async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        ok: false,
        message: "Usuario y contraseña requeridos",
      });
    }

    const result = await query(
      `SELECT id, username, password_hash, role, name FROM users WHERE username = $1`,
      [username],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        ok: false,
        message: "Usuario o contraseña invalidos",
      });
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({
        ok: false,
        message: "Usuario o contraseña invalidos",
      });
    }

    const token = generateToken({
      userId: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
    });

    res.json({
      ok: true,
      token,
      session: {
        userId: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
