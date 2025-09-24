import express from "express";
import { body, param, validationResult } from "express-validator";
import { prisma } from "../index";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { sendMessageToAI } from "../services/aiService";

const router = express.Router();

// Send message to AI and get response
router.post(
  "/",
  [
    authenticateToken,
    body("conversationId").isUUID(),
    body("content").trim().isLength({ min: 1, max: 1000 }),
  ],
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { conversationId, content } = req.body;

      // Verify conversation belongs to user
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          userId: req.user!.id,
        },
      });

      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      // Save user message
      const userMessage = await prisma.message.create({
        data: {
          conversationId,
          content,
          role: "USER",
        },
      });

      // Get conversation history for context
      const messages = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: "asc" },
        include: {
          prompt: true,
        },
      });

      // Send to AI service
      const startTime = Date.now();
      const aiResponse = await sendMessageToAI(content, messages);
      const responseTime = Date.now() - startTime;

      // Save AI response
      const aiMessage = await prisma.message.create({
        data: {
          conversationId,
          content: aiResponse.content,
          role: "ASSISTANT",
          promptId: aiResponse.promptId,
          responseTimeMs: responseTime,
        },
        include: {
          prompt: {
            select: { id: true, name: true },
          },
        },
      });

      res.json({
        userMessage,
        aiMessage,
      });
    } catch (error) {
      console.error("Send message error:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  }
);

// Get messages for a conversation
router.get(
  "/conversation/:conversationId",
  [authenticateToken, param("conversationId").isUUID()],
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { conversationId } = req.params;

      // Verify conversation belongs to user
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          userId: req.user!.id,
        },
      });

      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      const messages = await prisma.message.findMany({
        where: { conversationId },
        include: {
          prompt: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: "asc" },
      });

      res.json({ messages });
    } catch (error) {
      console.error("Get messages error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
