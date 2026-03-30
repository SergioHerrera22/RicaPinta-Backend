import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import authRouter from "./routes/auth.js";
import productsRouter from "./routes/products.js";
import salesRouter from "./routes/sales.js";
import aiRouter from "./routes/ai.js";
import syncRouter from "./routes/sync.js";
import { errorHandler } from "./middleware/auth.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const defaultCorsOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:4000",
];

// Middleware de seguridad
app.use(helmet());

// CORS
const corsOrigins = (process.env.CORS_ORIGINS || defaultCorsOrigins.join(","))
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origen no permitido por CORS: ${origin}`));
    },
    credentials: true,
  }),
);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"),
  message: "Muchas solicitudes, intenta más tarde",
});
app.use(limiter);

// Body parser
app.use(express.json({ limit: "10mb" }));

// Health check
app.get("/health", (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// API Routes
app.use("/api/auth", authRouter);
app.use("/api/products", productsRouter);
app.use("/api/sales", salesRouter);
app.use("/api/ai", aiRouter);
app.use("/api/sync", syncRouter);

// 404
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    message: "Endpoint no encontrado",
  });
});

// Error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`RicaPinta Backend escuchando en puerto ${PORT}`);
  console.log(`Ambiente: ${process.env.NODE_ENV}`);
  console.log(`Orígenes CORS: ${corsOrigins.join(", ")}`);
});
