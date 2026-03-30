import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import { query } from "../config/database.js";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

// Procesar operaciones offline pendientes
router.post("/pending", authMiddleware, async (req, res, next) => {
  try {
    const { operations } = req.body;

    if (!Array.isArray(operations) || operations.length === 0) {
      return res.status(400).json({
        ok: false,
        message: "Se requiere array de operaciones",
      });
    }

    const results = [];
    const errors = [];

    for (const op of operations) {
      try {
        if (op.type === "adjustStock") {
          const result = await query(
            "UPDATE products SET stock = stock + $1 WHERE id = $2",
            [op.delta, op.productId],
          );
          results.push({
            id: op.id,
            type: op.type,
            status: "success",
          });
        } else if (op.type === "createSale") {
          const saleId = uuidv4();
          await query(
            "INSERT INTO sales (id, user_id, customer_name, payment_method, total, sale_number, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
            [
              saleId,
              req.user.userId,
              op.customerName,
              op.paymentMethod,
              op.total,
              Math.floor(Math.random() * 1000000),
              new Date().toISOString(),
            ],
          );
          results.push({
            id: op.id,
            type: op.type,
            status: "success",
            saleId,
          });
        }
      } catch (err) {
        errors.push({
          id: op.id,
          type: op.type,
          error: err.message,
        });
      }
    }

    res.json({
      ok: true,
      processed: results.length,
      failed: errors.length,
      results,
      errors,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
