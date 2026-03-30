import { seedProducts } from "./helpers.js";

async function seed() {
  try {
    console.log("🌱 Seeding datos...");
    await seedProducts();
    console.log("✅ Seed completado");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error en seed:", error);
    process.exit(1);
  }
}

seed();
