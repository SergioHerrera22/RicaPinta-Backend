import { query } from "../src/config/database.js";
import bcrypt from "bcryptjs";

export async function createTables() {
  try {
    // Tabla de usuarios
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'ventas')),
        name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de productos
    await query(`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(50) PRIMARY KEY,
        sku VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        brand VARCHAR(100) NOT NULL,
        stock INTEGER NOT NULL DEFAULT 0,
        min_stock INTEGER DEFAULT 5,
        cost DECIMAL(10, 2) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de ventas
    await query(`
      CREATE TABLE IF NOT EXISTS sales (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id),
        customer_name VARCHAR(255),
        payment_method VARCHAR(50),
        total DECIMAL(12, 2) NOT NULL,
        sale_number INTEGER NOT NULL,
        created_at TIMESTAMP NOT NULL,
        UNIQUE(sale_number)
      )
    `);

    // Tabla de items de venta
    await query(`
      CREATE TABLE IF NOT EXISTS sale_items (
        id UUID PRIMARY KEY,
        sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
        product_id VARCHAR(50) NOT NULL REFERENCES products(id),
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(10, 2) NOT NULL,
        subtotal DECIMAL(12, 2) NOT NULL
      )
    `);

    // Tabla de movimientos de cuenta corriente
    await query(`
      CREATE TABLE IF NOT EXISTS account_movements (
        id UUID PRIMARY KEY,
        customer_name VARCHAR(255) NOT NULL,
        type VARCHAR(20) NOT NULL CHECK (type IN ('debit', 'credit')),
        reference VARCHAR(255),
        amount DECIMAL(12, 2) NOT NULL,
        created_at TIMESTAMP NOT NULL
      )
    `);

    console.log("✓ Tablas creadas exitosamente");
  } catch (error) {
    console.error("Error creando tablas:", error);
    throw error;
  }
}

export async function seedUsers() {
  try {
    const adminPassword = await bcrypt.hash(
      process.env.ADMIN_PASSWORD || "admin123",
      10,
    );
    const ventasPassword = await bcrypt.hash(
      process.env.VENTAS_PASSWORD || "ventas123",
      10,
    );

    await query(
      `INSERT INTO users (username, password_hash, role, name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (username) DO NOTHING`,
      [
        process.env.ADMIN_USERNAME || "admin",
        adminPassword,
        "admin",
        "Administrador",
      ],
    );

    await query(
      `INSERT INTO users (username, password_hash, role, name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (username) DO NOTHING`,
      [
        process.env.VENTAS_USERNAME || "ventas",
        ventasPassword,
        "ventas",
        "Vendedor",
      ],
    );

    console.log("✓ Usuarios demo creados");
  } catch (error) {
    console.error("Error seeding usuarios:", error);
    throw error;
  }
}

export async function seedProducts() {
  try {
    const products = [
      [
        "P-001",
        "PIN-LAT-20-BLAN",
        "Latex Interior Blanco 20L",
        "Pinturas",
        "ColorMax",
        34,
        8,
        34500,
        48200,
      ],
      [
        "P-002",
        "PIN-SAT-4-GRIS",
        "Satinado Gris Perla 4L",
        "Pinturas",
        "Decorlux",
        19,
        6,
        12100,
        16900,
      ],
      [
        "P-003",
        "ROL-POLI-22",
        "Rodillo Poliamida 22cm",
        "Rodillos",
        "ProTools",
        52,
        12,
        2900,
        4300,
      ],
      [
        "P-004",
        "ROL-ESP-10",
        "Mini Rodillo Esponja 10cm",
        "Rodillos",
        "ProTools",
        11,
        10,
        1500,
        2300,
      ],
      [
        "P-005",
        "PINCEL-ANG-2",
        "Pincel Angular 2 pulgadas",
        "Pinceles",
        "MasterBrush",
        27,
        8,
        3200,
        4700,
      ],
      [
        "P-006",
        "PINCEL-RED-10",
        "Pincel Redondo N 10",
        "Pinceles",
        "MasterBrush",
        7,
        8,
        1900,
        2900,
      ],
      [
        "P-007",
        "BAR-MAR-1",
        "Barniz Marino Brillante 1L",
        "Barnices",
        "NauticCoat",
        16,
        5,
        7200,
        10300,
      ],
      [
        "P-008",
        "CINTA-MAS-48",
        "Cinta de Enmascarar 48mm",
        "Accesorios",
        "TapePro",
        68,
        20,
        900,
        1500,
      ],
      [
        "P-009",
        "LIJA-220",
        "Lija al Agua Grano 220",
        "Accesorios",
        "Abrasiv",
        90,
        30,
        210,
        390,
      ],
    ];

    for (const product of products) {
      await query(
        `INSERT INTO products (id, sku, name, category, brand, stock, min_stock, cost, price)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO NOTHING`,
        product,
      );
    }

    console.log("✓ Productos demo creados");
  } catch (error) {
    console.error("Error seeding productos:", error);
    throw error;
  }
}
