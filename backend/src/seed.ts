import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting seed...");

  // Create test user
  const hashedPassword = await bcrypt.hash("admin123", 10);

  const user = await prisma.user.upsert({
    where: { email: "admin@dashboard.com" },
    update: {},
    create: {
      email: "admin@dashboard.com",
      name: "Admin User",
      password: hashedPassword,
      avatarUrl: "https://via.placeholder.com/150/007bff/ffffff.png?text=A",
    },
  });

  console.log("Created user:", user.email);

  // Create prompts
  const prompts = [
    {
      name: "Joven Simpático",
      content:
        "Eres un asistente de IA joven, energético y simpático. Usas un lenguaje casual y emojis ocasionales. Eres entusiasta y amigable en todas tus respuestas.",
      isActive: true,
    },
    {
      name: "Viejo Tradicional",
      content:
        'Eres un asistente de IA mayor, formal y tradicional. Hablas de manera respetuosa y formal, usando "usted" siempre. Eres cortés y conservador en tus respuestas.',
      isActive: false,
    },
    {
      name: "Gringo con Español Básico",
      content:
        "Eres un asistente de IA estadounidense que está aprendiendo español. Mezclas inglés y español en tus respuestas. A veces cometes errores gramaticales adorables.",
      isActive: false,
    },
    {
      name: "Asistente Profesional",
      content:
        "Eres un asistente de IA profesional y eficiente. Proporcionas respuestas claras, concisas y útiles. Mantienes un tono profesional pero amigable.",
      isActive: false,
    },
  ];

  // Clear existing prompts and recreate with proper UUIDs
  await prisma.prompt.deleteMany();

  for (const promptData of prompts) {
    await prisma.prompt.create({
      data: promptData,
    });
  }

  console.log("Created prompts");

  // Create sample conversations with different channels
  const conversations = [
    {
      title: "Consulta sobre productos",
      channel: "WEB" as const,
      status: "CLOSED" as const,
      rating: 5,
      durationSeconds: 120,
    },
    {
      title: "Soporte técnico",
      channel: "WHATSAPP" as const,
      status: "CLOSED" as const,
      rating: 4,
      durationSeconds: 300,
    },
    {
      title: "Información general",
      channel: "INSTAGRAM" as const,
      status: "OPEN" as const,
      rating: null,
      durationSeconds: null,
    },
    {
      title: "Problema con pedido",
      channel: "WEB" as const,
      status: "CLOSED" as const,
      rating: 2,
      durationSeconds: 450,
    },
    {
      title: "Consulta de precios",
      channel: "WHATSAPP" as const,
      status: "CLOSED" as const,
      rating: 5,
      durationSeconds: 90,
    },
  ];

  const activePrompt = await prisma.prompt.findFirst({
    where: { isActive: true },
  });

  for (const convData of conversations) {
    const conversation = await prisma.conversation.create({
      data: {
        ...convData,
        userId: user.id,
      },
    });

    // Add sample messages
    const messages = [
      {
        content: "¡Hola! ¿En qué puedo ayudarte hoy?",
        role: "ASSISTANT" as const,
        promptId: activePrompt?.id,
      },
      {
        content: "Necesito información sobre sus servicios",
        role: "USER" as const,
      },
      {
        content:
          "Por supuesto, estaré encantado de ayudarte con información sobre nuestros servicios. ¿Hay algo específico que te interese?",
        role: "ASSISTANT" as const,
        promptId: activePrompt?.id,
        responseTimeMs: 1500,
      },
    ];

    for (const msgData of messages) {
      await prisma.message.create({
        data: {
          ...msgData,
          conversationId: conversation.id,
        },
      });
    }
  }

  console.log("Created sample conversations and messages");

  // Create additional conversations for the last 30 days to show trends
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);

    const numConversations = Math.floor(Math.random() * 5) + 1; // 1-5 conversations per day

    for (let j = 0; j < numConversations; j++) {
      const conversation = await prisma.conversation.create({
        data: {
          title: `Conversación del ${date.toLocaleDateString()}`,
          channel: ["WEB", "WHATSAPP", "INSTAGRAM"][
            Math.floor(Math.random() * 3)
          ] as any,
          status: "CLOSED",
          rating: Math.floor(Math.random() * 5) + 1,
          durationSeconds: Math.floor(Math.random() * 300) + 60,
          userId: user.id,
          createdAt: date,
        },
      });

      // Add a couple of messages
      await prisma.message.create({
        data: {
          content: "Mensaje del usuario",
          role: "USER",
          conversationId: conversation.id,
          createdAt: date,
        },
      });

      await prisma.message.create({
        data: {
          content: "Respuesta del asistente",
          role: "ASSISTANT",
          promptId: activePrompt?.id,
          responseTimeMs: Math.floor(Math.random() * 3000) + 500,
          conversationId: conversation.id,
          createdAt: new Date(date.getTime() + 1000),
        },
      });
    }
  }

  console.log("Created trend data for analytics");

  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
