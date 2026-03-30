import express from "express";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

const AI_PROVIDER = (process.env.AI_PROVIDER || "auto").toLowerCase();
const AI_MAX_RETRIES = parseInt(process.env.AI_MAX_RETRIES || "2", 10);
const AI_RETRY_BASE_MS = parseInt(process.env.AI_RETRY_BASE_MS || "1200", 10);

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free";
const OPENROUTER_BASE_URL =
  process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
const OPENROUTER_REFERER = process.env.OPENROUTER_REFERER;
const OPENROUTER_TITLE = process.env.OPENROUTER_TITLE || "RicaPinta Backend";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryDelayMs(response, attempt) {
  const retryAfterHeader = response.headers.get("retry-after");
  const retryAfterSeconds = Number(retryAfterHeader);

  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return retryAfterSeconds * 1000;
  }

  // Exponential backoff: 1.2s, 2.4s, 4.8s...
  return AI_RETRY_BASE_MS * 2 ** (attempt - 1);
}

function buildPrompt({ productName, brand, category, sku }) {
  return [
    "Actua como asesor tecnico de una pintureria con enfoque comercial.",
    "Producto:",
    `- Nombre: ${productName}`,
    `- Marca: ${brand}`,
    `- Categoria: ${category}`,
    `- SKU: ${sku}`,
    "Devuelve SOLO JSON valido con esta estructura:",
    '{"resumen":"", "usos":[""], "rendimiento":"", "secado":"", "superficies":[""], "precauciones":[""], "preguntasVenta":[""]}',
    "El resumen debe ser claro, util para vendedor y no mas de 70 palabras.",
    "No inventes datos demasiado especificos. Si no sabes, indica: 'Confirmar en ficha tecnica oficial'.",
    "Responde en espanol neutro para vendedor de mostrador.",
  ].join("\n");
}

function cleanModelText(text) {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

function getProviderOrder() {
  if (AI_PROVIDER === "openrouter") {
    return ["openrouter"];
  }

  if (AI_PROVIDER === "gemini") {
    return ["gemini"];
  }

  if (AI_PROVIDER === "local") {
    return ["local"];
  }

  const providers = [];

  if (OPENROUTER_API_KEY) {
    providers.push("openrouter");
  }

  if (GEMINI_API_KEY) {
    providers.push("gemini");
  }

  providers.push("local");

  return providers;
}

function buildLocalBrief({ productName, brand, category, sku }) {
  const categoryText = (category || "pintura").toLowerCase();

  let usos = [
    "Aplicacion general en obra nueva y mantenimiento",
    "Retoques en superficies preparadas",
  ];

  let superficies = [
    "Mamposteria preparada",
    "Yeso seco o enduido curado",
    "Superficies previamente pintadas en buen estado",
  ];

  let rendimiento = "Confirmar en ficha tecnica oficial";
  let secado = "Confirmar en ficha tecnica oficial";

  if (categoryText.includes("esmalte")) {
    usos = [
      "Proteccion y terminacion de metal y madera",
      "Puertas, marcos y herreria de interior o exterior",
    ];
    superficies = [
      "Metal con anticorrosivo previo",
      "Madera sellada y lijada",
      "Superficies limpias sin grasa ni polvo",
    ];
  } else if (categoryText.includes("impermeabil")) {
    usos = [
      "Sellado preventivo de filtraciones",
      "Mantenimiento de techos y terrazas",
    ];
    superficies = [
      "Losa de hormigon curada",
      "Membranas compatibles segun fabricante",
      "Superficies secas y limpias",
    ];
  } else if (
    categoryText.includes("latex") ||
    categoryText.includes("lat") ||
    categoryText.includes("acril")
  ) {
    usos = [
      "Pintado de paredes y cielorrasos",
      "Mantenimiento interior de alto transito",
    ];
    superficies = [
      "Mamposteria interior",
      "Revoque fino y yeso",
      "Superficies con fondo sellador cuando corresponda",
    ];
  }

  return {
    resumen: `${productName || "Producto"} de ${brand || "marca no informada"} para categoria ${category || "general"}. Recomendado para venta asistida con validacion final de ficha tecnica oficial antes de cerrar cantidades y manos.`,
    usos,
    rendimiento,
    secado,
    superficies,
    precauciones: [
      "Aplicar en area ventilada y con EPP adecuado",
      "Respetar preparacion de superficie y tiempos entre manos",
      "Confirmar compatibilidad con el sistema de pintado existente",
    ],
    preguntasVenta: [
      "La superficie es interior o exterior?",
      "Ya tiene pintura previa o va sobre material virgen?",
      "Que terminacion busca: mate, satinado o brillante?",
      `Tiene a mano la ficha tecnica del SKU ${sku || "no informado"}?`,
    ],
  };
}

async function callOpenRouter(prompt) {
  if (!OPENROUTER_API_KEY) {
    return {
      ok: false,
      provider: "openrouter",
      status: 500,
      rawErrorBody: "OPENROUTER_API_KEY no configurada",
    };
  }

  let response;

  for (let attempt = 1; attempt <= AI_MAX_RETRIES + 1; attempt += 1) {
    const headers = {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "X-Title": OPENROUTER_TITLE,
    };

    if (OPENROUTER_REFERER) {
      headers["HTTP-Referer"] = OPENROUTER_REFERER;
    }

    response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          {
            role: "system",
            content:
              "Devuelves JSON valido y preciso para asistencia tecnica de pintureria.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.2,
        top_p: 0.9,
      }),
    });

    if (response.ok) {
      break;
    }

    if ([429, 503].includes(response.status) && attempt <= AI_MAX_RETRIES) {
      const delayMs = getRetryDelayMs(response, attempt);
      await sleep(delayMs);
      continue;
    }

    break;
  }

  if (!response || !response.ok) {
    return {
      ok: false,
      provider: "openrouter",
      status: response?.status || 500,
      rawErrorBody: response ? await response.text() : "Sin respuesta",
    };
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content || "";

  return {
    ok: true,
    provider: "openrouter",
    text,
  };
}

async function callGemini(prompt) {
  if (!GEMINI_API_KEY) {
    return {
      ok: false,
      provider: "gemini",
      status: 500,
      rawErrorBody: "GEMINI_API_KEY no configurada",
    };
  }

  let response;

  for (let attempt = 1; attempt <= AI_MAX_RETRIES + 1; attempt += 1) {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            topP: 0.9,
          },
        }),
      },
    );

    if (response.ok) {
      break;
    }

    if (response.status === 429 && attempt <= AI_MAX_RETRIES) {
      const delayMs = getRetryDelayMs(response, attempt);
      await sleep(delayMs);
      continue;
    }

    break;
  }

  if (!response || !response.ok) {
    return {
      ok: false,
      provider: "gemini",
      status: response?.status || 500,
      rawErrorBody: response ? await response.text() : "Sin respuesta",
    };
  }

  const data = await response.json();
  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text)
      .filter(Boolean)
      .join("\n") || "";

  return {
    ok: true,
    provider: "gemini",
    text,
  };
}

router.post("/product-brief", async (req, res, next) => {
  try {
    const { productName, brand, category, sku } = req.body;

    const providers = getProviderOrder();

    if (providers.length === 0) {
      return res.status(500).json({
        ok: false,
        message: "No hay proveedor IA configurado.",
      });
    }

    const prompt = buildPrompt({ productName, brand, category, sku });

    let finalText = "";
    let usedProvider = "";
    let lastProviderError = null;

    for (const provider of providers) {
      if (provider === "local") {
        finalText = JSON.stringify(
          buildLocalBrief({ productName, brand, category, sku }),
        );
        usedProvider = "local";
        break;
      }

      const result =
        provider === "openrouter"
          ? await callOpenRouter(prompt)
          : await callGemini(prompt);

      if (result.ok) {
        finalText = result.text;
        usedProvider = result.provider;
        break;
      }

      lastProviderError = result;
    }

    if (!finalText) {
      if (lastProviderError?.status === 429) {
        return res.status(429).json({
          ok: false,
          message:
            "Servicio de IA temporalmente saturado. Intenta de nuevo en unos segundos.",
        });
      }

      return res.status(502).json({
        ok: false,
        message: "No se pudo generar el resumen con IA en este momento",
        detail:
          process.env.NODE_ENV === "production"
            ? undefined
            : `${lastProviderError?.provider || "unknown"} API error (${lastProviderError?.status || "sin status"}): ${lastProviderError?.rawErrorBody || "Sin detalle"}`,
      });
    }

    const cleaned = cleanModelText(finalText);

    let parsed;

    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return res.status(502).json({
        ok: false,
        message: "La IA devolvio una respuesta invalida. Intenta nuevamente.",
        detail: process.env.NODE_ENV === "production" ? undefined : cleaned,
      });
    }

    res.json({
      ok: true,
      brief: parsed,
      provider: usedProvider,
    });
  } catch (error) {
    console.error("AI error:", error);
    next(error);
  }
});

export default router;
