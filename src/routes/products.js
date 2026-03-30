import express from "express";
import { query } from "../config/database.js";
import { authMiddleware } from "../middleware/auth.js";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

// Listar productos
router.get("/", async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, sku, name, category, brand, stock, min_stock, cost, price, created_at
       FROM products ORDER BY name ASC`,
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Crear producto
router.post("/", authMiddleware, async (req, res, next) => {
  try {
    const { sku, name, category, brand, stock, min_stock, cost, price } = req.body;

    if (!sku || !name || !category || !brand) {
      return res.status(400).json({ ok: false, message: "Faltan campos obligatorios: sku, name, category, brand" });
    }
    if (typeof cost !== "number" || typeof price !== "number") {
      return res.status(400).json({ ok: false, message: "Costo y precio deben ser numeros" });
    }

    const existing = await query("SELECT id FROM products WHERE sku = $1", [sku]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ ok: false, message: "Ya existe un producto con ese SKU" });
    }

    const id = `P-${uuidv4().slice(0, 8).toUpperCase()}`;
    await query(
      `INSERT INTO products (id, sku, name, category, brand, stock, min_stock, cost, price)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id, sku, name, category, brand, stock ?? 0, min_stock ?? 5, cost, price],
    );

    const result = await query("SELECT * FROM products WHERE id = $1", [id]);
    res.status(201).json({ ok: true, product: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Editar producto
router.put("/:id", authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { sku, name, category, brand, stock, min_stock, cost, price } = req.body;

    if (!sku || !name || !category || !brand) {
      return res.status(400).json({ ok: false, message: "Faltan campos obligatorios" });
    }

    const existing = await query("SELECT id FROM products WHERE id = $1", [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ ok: false, message: "Producto no encontrado" });
    }

    // Verificar SKU no duplicado en otro producto
    const skuConflict = await query(
      "SELECT id FROM products WHERE sku = $1 AND id != $2", [sku, id]
    );
    if (skuConflict.rows.length > 0) {
      return res.status(409).json({ ok: false, message: "Ese SKU ya pertenece a otro producto" });
    }

    await query(
      `UPDATE products SET sku=$1, name=$2, category=$3, brand=$4, stock=$5, min_stock=$6, cost=$7, price=$8
       WHERE id=$9`,
      [sku, name, category, brand, stock ?? 0, min_stock ?? 5, cost, price, id],
    );

    const result = await query("SELECT * FROM products WHERE id = $1", [id]);
    res.json({ ok: true, product: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Eliminar producto
router.delete("/:id", authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await query("SELECT id FROM products WHERE id = $1", [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ ok: false, message: "Producto no encontrado" });
    }

    // Verificar si tiene ventas asociadas
    const salesCheck = await query(
      "SELECT id FROM sale_items WHERE product_id = $1 LIMIT 1", [id]
    );
    if (salesCheck.rows.length > 0) {
      return res.status(409).json({
        ok: false,
        message: "No se puede eliminar: el producto tiene ventas registradas",
      });
    }

    await query("DELETE FROM products WHERE id = $1", [id]);
    res.json({ ok: true, deletedId: id });
  } catch (error) {
    next(error);
  }
});

// Ajustar stock de producto
router.patch("/:id/stock", authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { delta } = req.body;

    if (typeof delta !== "number" || Number.isNaN(delta)) {
      return res.status(400).json({
        ok: false,
        message: "Delta debe ser un numero",
      });
    }

    const client = await require("../config/database.js").getClient();

    try {
      await client.query("BEGIN");

      const productResult = await client.query(
        `SELECT id, stock FROM products WHERE id = $1 FOR UPDATE`,
        [id],
      );

      if (productResult.rows.length === 0) {
        throw new Error("Producto no encontrado");
      }

      const newStock = Math.max(0, productResult.rows[0].stock + delta);

      await client.query(`UPDATE products SET stock = $1 WHERE id = $2`, [
        newStock,
        id,
      ]);

      await client.query("COMMIT");

      res.json({
        ok: true,
        productId: id,
        newStock,
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

// Actualizar precios masivo
router.patch("/prices/bulk", authMiddleware, async (req, res, next) => {
  try {
    const { scope, category, percent } = req.body;

    if (typeof percent !== "number" || Number.isNaN(percent)) {
      return res.status(400).json({
        ok: false,
        message: "Porcentaje invalido",
      });
    }

    const factor = 1 + percent / 100;
    let updateQuery = "UPDATE products SET price = ROUND(price * $1) ";
    let params = [factor];
    let paramIndex = 2;

    if (scope === "category" && category) {
      updateQuery += `WHERE category = $${paramIndex}`;
      params.push(category);
    }

    const result = await query(updateQuery, params);

    res.json({
      ok: true,
      rowsAffected: result.rowCount,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
