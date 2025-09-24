import express from "express";
import { body, param, validationResult } from "express-validator";
import { prisma } from "../index";
import { authenticateToken, AuthRequest } from "../middleware/auth";

const router = express.Router();

// Get all prompts
router.get("/prompts", [authenticateToken], async (req: AuthRequest, res) => {
  try {
    const prompts = await prisma.prompt.findMany({
      orderBy: { createdAt: "desc" },
    });

    res.json({ prompts });
  } catch (error) {
    console.error("Get prompts error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create new prompt
router.post(
  "/prompts",
  [
    authenticateToken,
    body("name").trim().isLength({ min: 1, max: 100 }),
    body("content").trim().isLength({ min: 10, max: 2000 }),
  ],
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, content } = req.body;

      const prompt = await prisma.prompt.create({
        data: {
          name,
          content,
          isActive: false,
        },
      });

      res.status(201).json({ prompt });
    } catch (error) {
      console.error("Create prompt error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Update prompt
router.patch(
  "/prompts/:id",
  [
    authenticateToken,
    param("id").isUUID(),
    body("name").optional().trim().isLength({ min: 1, max: 100 }),
    body("content").optional().trim().isLength({ min: 10, max: 2000 }),
    body("isActive").optional().isBoolean(),
  ],
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const updateData: any = {};

      if (req.body.name !== undefined) updateData.name = req.body.name;
      if (req.body.content !== undefined) updateData.content = req.body.content;
      if (req.body.isActive !== undefined)
        updateData.isActive = req.body.isActive;

      // If setting this prompt as active, deactivate others
      if (req.body.isActive === true) {
        await prisma.prompt.updateMany({
          where: { isActive: true },
          data: { isActive: false },
        });
      }

      const prompt = await prisma.prompt.update({
        where: { id },
        data: updateData,
      });

      res.json({ prompt });
    } catch (error) {
      console.error("Update prompt error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Delete prompt
router.delete(
  "/prompts/:id",
  [authenticateToken, param("id").isUUID()],
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;

      // Check if prompt exists
      const existingPrompt = await prisma.prompt.findUnique({
        where: { id },
      });

      if (!existingPrompt) {
        return res.status(404).json({ error: "Prompt not found" });
      }

      await prisma.prompt.delete({
        where: { id },
      });

      res.status(204).send();
    } catch (error) {
      console.error("Delete prompt error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Get user profile
router.get("/profile", [authenticateToken], async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get AI configuration
router.get("/ai-config", [authenticateToken], async (req: AuthRequest, res) => {
  try {
    const config = {
      baseUrl: process.env.AI_BASE_URL || "https://api.aimlapi.com/v1",
      model: process.env.AI_MODEL || "google/gemma-3-12b-it",
      apiKeySet: !!(
        process.env.OPENAI_API_KEY &&
        process.env.OPENAI_API_KEY !== "fake-key-for-development"
      ),
    };

    res.json({ config });
  } catch (error) {
    console.error("Get AI config error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update user profile
router.patch(
  "/profile",
  [
    authenticateToken,
    body("name").optional().trim().isLength({ min: 2, max: 100 }),
    body("avatarUrl").optional().isURL(),
  ],
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const updateData: any = {};
      if (req.body.name !== undefined) updateData.name = req.body.name;
      if (req.body.avatarUrl !== undefined)
        updateData.avatarUrl = req.body.avatarUrl;

      const user = await prisma.user.update({
        where: { id: req.user!.id },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          createdAt: true,
        },
      });

      res.json({ user });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
