import { createHash } from "crypto";
import OpenAI from "openai";
import { prisma, redis } from "../index";

// Initialize OpenAI client lazily
let openai: OpenAI | null = null;
let lastConfig = { apiKey: "", baseURL: "" };

// Rate limiting state
let requestCount = 0;
let windowStart = Date.now();
const WINDOW_SIZE = 60 * 60 * 1000; // 1 hour in milliseconds
const MAX_REQUESTS = 8; // Conservative limit (AIML free tier allows 10/hour)

// Reset rate limit window
const resetRateLimitWindow = () => {
  const now = Date.now();
  if (now - windowStart >= WINDOW_SIZE) {
    requestCount = 0;
    windowStart = now;
  }
};

// Check if request is allowed
const isRateLimited = () => {
  resetRateLimitWindow();
  return requestCount >= MAX_REQUESTS;
};

// Increment request counter
const incrementRequestCount = () => {
  resetRateLimitWindow();
  requestCount++;
};

const getOpenAIClient = () => {
  const currentConfig = {
    apiKey: process.env.OPENAI_API_KEY || "fake-key-for-development",
    baseURL: process.env.AI_BASE_URL || "https://api.aimlapi.com/v1",
  };

  // Reinitialize client if configuration changed
  if (
    !openai ||
    lastConfig.apiKey !== currentConfig.apiKey ||
    lastConfig.baseURL !== currentConfig.baseURL
  ) {
    openai = new OpenAI({
      apiKey: currentConfig.apiKey,
      baseURL: currentConfig.baseURL,
    });
    lastConfig = currentConfig;
  }

  return openai;
};

// Delay function for retries
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Generate cache key for a request
const generateCacheKey = (
  userMessage: string,
  conversationHistory: Message[],
  activePrompt: any
): string => {
  const contextData = {
    message: userMessage,
    history: conversationHistory
      .slice(-5)
      .map((msg) => ({ role: msg.role, content: msg.content })), // Last 5 messages for context
    prompt: activePrompt?.id || "default",
    model: process.env.AI_MODEL || "default",
  };
  const hash = createHash("md5")
    .update(JSON.stringify(contextData))
    .digest("hex");
  return `ai_cache:${hash}`;
};

// Get cached response
const getCachedResponse = async (
  cacheKey: string
): Promise<AIResponse | null> => {
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log("🎯 Cache hit for AI request");
      return JSON.parse(cached);
    }
  } catch (error: any) {
    console.log("Cache read error:", error?.message || "Unknown error");
  }
  return null;
};

// Save response to cache (expire after 1 hour)
const setCachedResponse = async (
  cacheKey: string,
  response: AIResponse
): Promise<void> => {
  try {
    await redis.setEx(cacheKey, 3600, JSON.stringify(response)); // Cache for 1 hour
    console.log("💾 Response cached");
  } catch (error: any) {
    console.log("Cache write error:", error?.message || "Unknown error");
  }
};

// Retry with exponential backoff
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;

      // Don't retry on certain error types
      if (error.status === 401 || error.status === 403) {
        throw error;
      }

      // If it's the last attempt, throw the error
      if (attempt > maxRetries) {
        throw error;
      }

      // Calculate delay with exponential backoff + jitter
      const delayMs =
        baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
      console.log(
        `Request failed (attempt ${attempt}), retrying in ${Math.round(
          delayMs
        )}ms...`,
        {
          status: error.status,
          message: error.message?.substring(0, 100),
        }
      );

      await delay(delayMs);
    }
  }

  throw new Error("Max retries exceeded");
};

interface Message {
  role: "USER" | "ASSISTANT";
  content: string;
  prompt?: {
    id: string;
    name: string;
    content: string;
  } | null;
}

interface AIResponse {
  content: string;
  promptId: string | null;
}

export async function sendMessageToAI(
  userMessage: string,
  conversationHistory: Message[]
): Promise<AIResponse> {
  try {
    // Get active prompt
    const activePrompt = await prisma.prompt.findFirst({
      where: { isActive: true },
    });

    // Generate cache key
    const cacheKey = generateCacheKey(
      userMessage,
      conversationHistory,
      activePrompt
    );

    // Check cache first
    const cachedResponse = await getCachedResponse(cacheKey);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Check rate limiting
    if (isRateLimited()) {
      const timeUntilReset = WINDOW_SIZE - (Date.now() - windowStart);
      const minutesLeft = Math.ceil(timeUntilReset / (60 * 1000));
      throw new Error(
        `Rate limit exceeded. Try again in ${minutesLeft} minutes. (Free tier: ${MAX_REQUESTS} requests/hour)`
      );
    }

    // If no OpenAI key, return mock response
    if (
      !process.env.OPENAI_API_KEY ||
      process.env.OPENAI_API_KEY === "fake-key-for-development"
    ) {
      const mockResponse = generateMockResponse(userMessage, activePrompt);
      await setCachedResponse(cacheKey, mockResponse);
      return mockResponse;
    }

    // Build conversation context for OpenAI
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

    // Add system message with active prompt
    if (activePrompt) {
      messages.push({
        role: "system",
        content: activePrompt.content,
      });
    } else {
      messages.push({
        role: "system",
        content:
          "Eres un asistente de IA útil y amigable. Responde de manera clara y concisa.",
      });
    }

    // Add conversation history (last 10 messages to avoid token limit)
    const recentHistory = conversationHistory.slice(-10);
    recentHistory.forEach((msg) => {
      messages.push({
        role: msg.role === "USER" ? "user" : "assistant",
        content: msg.content,
      });
    });

    // Add current user message
    messages.push({
      role: "user",
      content: userMessage,
    });

    // Make API call with retry logic and rate limiting
    const completion = await retryWithBackoff(async () => {
      // Increment request count before making request
      incrementRequestCount();

      console.log(
        `Making AI request (${requestCount}/${MAX_REQUESTS} this hour)...`
      );

      const openaiClient = getOpenAIClient();
      return await openaiClient.chat.completions.create({
        model: process.env.AI_MODEL || "google/gemma-3-12b-it",
        messages,
        max_tokens: 500,
        temperature: 0.7,
      });
    });

    const responseContent =
      completion.choices[0]?.message?.content ||
      "Lo siento, no pude generar una respuesta.";

    const response: AIResponse = {
      content: responseContent,
      promptId: activePrompt?.id || null,
    };

    // Cache the successful response
    await setCachedResponse(cacheKey, response);

    return response;
  } catch (error: any) {
    console.error("AI Service error:", error);

    // Handle specific error types
    if (error.message?.includes("Rate limit exceeded")) {
      throw error; // Re-throw rate limit errors to show proper message to user
    }

    // Fallback to mock response on other errors
    const activePrompt = await prisma.prompt.findFirst({
      where: { isActive: true },
    });

    return generateMockResponse(userMessage, activePrompt);
  }
}

function generateMockResponse(
  userMessage: string,
  activePrompt: any
): AIResponse {
  const lowerMessage = userMessage.toLowerCase();

  // Mock responses based on active prompt personality
  let responses: string[] = [];

  if (activePrompt?.name.includes("Joven")) {
    responses = [
      "¡Hey! ¡Qué tal! Me parece genial lo que me dices 😊",
      "Oye, eso suena súper interesante. ¿Me cuentas más?",
      "¡Wow! No sabía eso. Gracias por compartirlo conmigo.",
      "Está buenísimo lo que me comentas. ¿Y qué más?",
    ];
  } else if (activePrompt?.name.includes("Tradicional")) {
    responses = [
      "Buenos días. Le agradezco su consulta. Permítame ayudarle.",
      "Estimado usuario, he recibido su mensaje. ¿En qué puedo asistirle?",
      "Su consulta es muy importante para nosotros. Le responderé con gusto.",
      "Muchas gracias por contactarnos. Estaré encantado de ayudarle.",
    ];
  } else if (activePrompt?.name.includes("Gringo")) {
    responses = [
      "Hello amigo! I understand poco español but I try to help.",
      "Ah sí, I think I comprendo what you say. Very interesante!",
      "Sorry if my español is not perfecto, but I want to ayudar.",
      "Thank you for your mensaje. Is very importante for me.",
    ];
  } else {
    // Default responses
    responses = [
      "Entiendo tu consulta. ¿Podrías darme más detalles?",
      "Gracias por tu mensaje. Estoy aquí para ayudarte.",
      "Interesante punto de vista. ¿Qué opinas sobre esto?",
      "Me parece una buena pregunta. Déjame pensarlo...",
      "Claro, puedo ayudarte con eso. ¿Necesitas algo específico?",
    ];
  }

  // Add context-aware responses
  if (lowerMessage.includes("hola") || lowerMessage.includes("buenos")) {
    responses.unshift("¡Hola! Un gusto saludarte. ¿En qué puedo ayudarte hoy?");
  } else if (lowerMessage.includes("gracias")) {
    responses.unshift("¡De nada! Es un placer poder ayudarte.");
  } else if (lowerMessage.includes("adiós") || lowerMessage.includes("chau")) {
    responses.unshift("¡Hasta luego! Que tengas un excelente día.");
  }

  const randomResponse =
    responses[Math.floor(Math.random() * responses.length)];

  return {
    content: randomResponse,
    promptId: activePrompt?.id || null,
  };
}
