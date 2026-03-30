import { createTables, seedUsers, seedProducts } from "./helpers.js";

async function migrate() {
  try {
    console.log("🔄 Iniciando migraciones...");

    await createTables();
    await seedUsers();
    await seedProducts();

    console.log("✅ Migraciones completadas exitosamente");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error en migraciones:", error);
    process.exit(1);
  }
}

migrate();
