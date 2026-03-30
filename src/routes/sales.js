import express from "express";
import { query } from "../config/database.js";
import { authMiddleware } from "../middleware/auth.js";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

router.post("/", authMiddleware, async (req, res, next) => {
  try {
    const { customerName, paymentMethod, items } = req.body;
    const userId = req.user.userId;

    if (!items || items.length === 0) {
      return res.status(400).json({
        ok: false,
        message: "Venta debe tener al menos un item",
      });
    }

    const client = await require("../config/database.js").getClient();

    try {
      await client.query("BEGIN");

      const saleId = uuidv4();
      const now = new Date().toISOString();
      let totalAmount = 0;

      // Procesar cada item y descontar stock
      for (const item of items) {
        const productResult = await client.query(
          `SELECT id, stock, price FROM products WHERE id = $1 FOR UPDATE`,
          [item.productId],
        );

        if (productResult.rows.length === 0) {
          throw new Error(`Producto ${item.productId} no encontrado`);
        }

        const product = productResult.rows[0];

        if (product.stock < item.quantity) {
          throw new Error(`Stock insuficiente para ${item.productId}`);
        }

        const subtotal = item.quantity * item.unitPrice;
        totalAmount += subtotal;

        // Descontar stock
        await client.query(
          `UPDATE products SET stock = stock - $1 WHERE id = $2`,
          [item.quantity, item.productId],
        );

        // Registrar línea de venta
        await client.query(
          `INSERT INTO sale_items (id, sale_id, product_id, quantity, unit_price, subtotal)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            uuidv4(),
            saleId,
            item.productId,
            item.quantity,
            item.unitPrice,
            subtotal,
          ],
        );
      }

      // Crear registro de venta
      const saleNumber = Math.floor(Math.random() * 1000000);
      await client.query(
        `INSERT INTO sales (id, user_id, customer_name, payment_method, total, sale_number, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          saleId,
          userId,
          customerName || "Consumidor final",
          paymentMethod,
          totalAmount,
          saleNumber,
          now,
        ],
      );

      // Si pago es cuenta corriente, registrar movimiento
      if (paymentMethod === "Cuenta corriente") {
        await client.query(
          `INSERT INTO account_movements (id, customer_name, type, reference, amount, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            uuidv4(),
            customerName,
            "debit",
            `BOL-${String(saleNumber).padStart(6, "0")}`,
            totalAmount,
            now,
          ],
        );
      }

      await client.query("COMMIT");

      res.status(201).json({
        ok: true,
        saleId,
        total: totalAmount,
        saleNumber,
        ticketNumber: `BOL-${String(saleNumber).padStart(6, "0")}`,
        createdAt: now,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

// Obtener detalle de venta
router.get("/:id", authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;

    const saleResult = await query(
      `SELECT id, user_id, customer_name, payment_method, total, sale_number, created_at
       FROM sales WHERE id = $1`,
      [id],
    );

    if (saleResult.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        message: "Venta no encontrada",
      });
    }

    const itemsResult = await query(
      `SELECT product_id, quantity, unit_price, subtotal FROM sale_items WHERE sale_id = $1`,
      [id],
    );

    res.json({
      ...saleResult.rows[0],
      items: itemsResult.rows,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
