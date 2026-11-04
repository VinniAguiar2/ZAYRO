import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT || 3000);
const TEXT_MODEL = process.env.OPENAI_TEXT_MODEL || "gpt-6-astra";
const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2.5-flare";

app.disable("x-powered-by");
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      upgradeInsecureRequests: null
    }
  }
}));
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const generationLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 8,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Muitas solicitações em pouco tempo. Aguarde um minuto e tente novamente." }
});

function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    const error = new Error("A chave da OpenAI ainda não foi configurada no servidor.");
    error.status = 503;
    throw error;
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function clean(value, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function sendError(res, error, fallback) {
  console.error(error);
  const status = Number.isInteger(error.status) ? error.status : 500;
  // Avoid returning internal stack traces or server configuration to visitors.
  const message = status === 503
    ? error.message
    : status === 429
      ? "Limite de uso atingido. Aguarde um pouco e tente novamente."
      : fallback;
  res.status(status).json({ error: message });
}

app.get("/api/health", (_req, res) => {
  res.json({ status: "online", configured: Boolean(process.env.OPENAI_API_KEY) });
});

app.post("/api/texts", generationLimiter, async (req, res) => {
  try {
    const brand = clean(req.body?.brand, 100);
    const segment = clean(req.body?.segment, 100) || "Comércio";
    const product = clean(req.body?.product, 180);
    const details = clean(req.body?.details, 700) || "Nenhum detalhe adicional";
    const goal = clean(req.body?.goal, 100) || "Vender mais";
    const channel = clean(req.body?.channel, 60) || "Instagram";
    const tone = clean(req.body?.tone, 80) || "Moderno e direto";
    if (!brand || !product) return res.status(400).json({ error: "Informe o estabelecimento e o produto ou serviço." });

    const prompt = `Você é o redator publicitário principal da ZAYRO, especializado em pequenos negócios brasileiros. Crie exatamente três anúncios diferentes em português brasileiro.\n\nEstabelecimento: ${brand}\nSegmento: ${segment}\nProduto/serviço: ${product}\nDetalhes confirmados: ${details}\nObjetivo: ${goal}\nCanal: ${channel}\nTom: ${tone}\n\nRegras: não invente preços, descontos, ingredientes, disponibilidade, endereço, telefone, resultados ou condições. Não transforme suposições em fatos. Cada anúncio deve ter uma chamada forte, corpo curto e CTA adequado ao canal. Varie os ângulos criativos. Evite clichês e linguagem artificial. Retorne somente JSON válido no formato {"ads":["anúncio 1","anúncio 2","anúncio 3"]}.`;

    const response = await getClient().responses.create({ model: TEXT_MODEL, input: prompt });
    const raw = (response.output_text || "").trim();
    const candidate = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const parsed = JSON.parse(candidate);
    if (!Array.isArray(parsed.ads) || parsed.ads.length !== 3 || parsed.ads.some(a => typeof a !== "string" || !a.trim())) {
      throw new Error("A resposta da IA não veio no formato esperado.");
    }
    res.json({ ads: parsed.ads });
  } catch (error) {
    sendError(res, error, "Não foi possível gerar os anúncios. Confira a configuração da API e tente novamente.");
  }
});

app.post("/api/image", generationLimiter, async (req, res) => {
  try {
    const brand = clean(req.body?.brand, 100);
    const segment = clean(req.body?.segment, 100) || "comércio";
    const product = clean(req.body?.product, 180);
    const details = clean(req.body?.details, 700) || "não especificados";
    const goal = clean(req.body?.goal, 100) || "divulgação";
    const visual = clean(req.body?.visual, 300) || "fotografia comercial premium, iluminação profissional e composição atraente";
    const kind = req.body?.kind === "logo" ? "logo" : "ad";
    const allowedSizes = new Set(["1024x1024", "1024x1536", "1536x1024"]);
    const size = allowedSizes.has(req.body?.size) ? req.body.size : "1024x1024";

    if (!brand || (kind !== "logo" && !product)) {
      return res.status(400).json({ error: "Informe o nome da marca e o produto ou serviço." });
    }

    const prompt = kind === "logo"
      ? `Desenvolva uma proposta de logotipo profissional para a marca "${brand}", do segmento ${segment}. Direção visual: ${visual}. Crie um símbolo original, memorável, simples e versátil, com tipografia de alta qualidade. O nome deve aparecer escrito exatamente: "${brand}". Composição limpa, excelente legibilidade em tamanhos pequenos, aparência de identidade visual de marca real. Fundo simples, sem mockup, sem marca d'água e sem elementos decorativos desnecessários.`
      : `Crie do zero uma imagem publicitária profissional e original para ${brand}, negócio do segmento ${segment}, promovendo ${product}. Detalhes confirmados: ${details}. Objetivo: ${goal}. Direção de arte: ${visual}. Fotografia comercial de alto nível, produto em destaque, iluminação refinada, composição visual equilibrada e acabamento profissional. Reserve espaço visual para inserir texto posteriormente. Não invente preços, promoções, informações comerciais ou logotipos de terceiros. Evite textos pequenos ou ilegíveis.`;

    const result = await getClient().images.generate({
      model: IMAGE_MODEL,
      prompt,
      size,
      quality: "high",
      output_format: "png",
      n: 1
    });
    const image = result.data?.[0]?.b64_json;
    if (!image) throw new Error("A API não retornou uma imagem.");
    res.json({ image, format: "png", size });
  } catch (error) {
    sendError(res, error, "Não foi possível gerar a imagem. Confira a configuração da API e tente novamente.");
  }
});

app.listen(PORT, () => console.log(`ZAYRO ativa na porta ${PORT}`));
