import "dotenv/config";
import express from "express";
import cors from "cors";
import { Request, Response } from "express";

const app = express();

const corsOptions = {
  origin: "http://localhost:5173",
  methods: ["GET", "POST"],
};

app.use(cors(corsOptions));
app.use(express.json());

// Store SSE clients
let inspectionClients: Response[] = [];
let contextClients: Response[] = [];
let tokenClients: Response[] = [];
let toolClients: Response[] = [];
let modelClients: Response[] = [];

// Store tool definitions
let toolDefinitions: unknown[] = [];
// Store model name
let currentModel: string = "";

// Server sent events (SSE) Inspection events endpoint
app.get("/api/inspection/messages", async (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  res.flushHeaders();

  inspectionClients.push(res);

  res.write("data: Connected to Agent Inspection Channel!\n\n");

  req.on("close", () => {
    inspectionClients = inspectionClients.filter((client) => client !== res);
    res.end();
    console.log("Inspection SSE Client disconnected");
  });
});

// Server sent events (SSE) Context events endpoint
app.get("/api/inspection/context", async (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  res.flushHeaders();

  contextClients.push(res);

  res.write("data: []\n\n");

  req.on("close", () => {
    contextClients = contextClients.filter((client) => client !== res);
    res.end();
    console.log("Context SSE Client disconnected");
  });
});

// HTTP endpoint for agent to send inspection messages
app.post("/api/inspection/messages", async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const lines = String(message).split(/\r?\n/);
    inspectionClients.forEach((client) => {
      try {
        for (const line of lines) {
          client.write(`data: ${line}\n`);
        }
        client.write(`\n`);
      } catch (error) {
        inspectionClients = inspectionClients.filter((c) => c !== client);
      }
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("[ERROR] Failed to send inspection message:", error);
    res.status(500).json({ error: "Failed to send inspection message" });
  }
});

// HTTP endpoint for agent to send context updates
app.post("/api/inspection/context", async (req: Request, res: Response) => {
  try {
    const { context } = req.body;
    
    if (!Array.isArray(context)) {
      return res.status(400).json({ error: "Context must be an array" });
    }

    contextClients.forEach((client) => {
      try {
        client.write(`data: ${JSON.stringify(context)}\n\n`);
      } catch (error) {
        contextClients = contextClients.filter((c) => c !== client);
      }
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("[ERROR] Failed to send context update:", error);
    res.status(500).json({ error: "Failed to send context update" });
  }
});

// Server sent events (SSE) Token usage endpoint
app.get("/api/inspection/tokens", async (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  res.flushHeaders();

  tokenClients.push(res);

  res.write("data: {}\n\n");

  req.on("close", () => {
    tokenClients = tokenClients.filter((client) => client !== res);
    res.end();
    console.log("Token SSE Client disconnected");
  });
});

// HTTP endpoint for agent to send token usage updates
app.post("/api/inspection/tokens", async (req: Request, res: Response) => {
  try {
    const { currentUsage, maxTokens } = req.body;

    const tokenUsage = {
      totalTokens: currentUsage,
      contextLimit: maxTokens,
      remainingTokens: maxTokens !== null ? maxTokens - currentUsage : null,
    };

    tokenClients.forEach((client) => {
      try {
        client.write(`data: ${JSON.stringify(tokenUsage)}\n\n`);
      } catch (error) {
        tokenClients = tokenClients.filter((c) => c !== client);
      }
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("[ERROR] Failed to send token usage update:", error);
    res.status(500).json({ error: "Failed to send token usage update" });
  }
});

// Server sent events (SSE) Tool definitions endpoint
app.get("/api/inspection/tools", async (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  res.flushHeaders();

  toolClients.push(res);

  res.write(`data: ${JSON.stringify(toolDefinitions)}\n\n`);

  req.on("close", () => {
    toolClients = toolClients.filter((client) => client !== res);
    res.end();
    console.log("Tool definitions SSE Client disconnected");
  });
});

// HTTP endpoint for agent to send tool definitions
app.post("/api/inspection/tools", async (req: Request, res: Response) => {
  try {
    const { toolDefinitions: tools } = req.body;
    
    if (!Array.isArray(tools)) {
      return res.status(400).json({ error: "Tool definitions must be an array" });
    }

    toolDefinitions = tools;

    toolClients.forEach((client) => {
      try {
        client.write(`data: ${JSON.stringify(toolDefinitions)}\n\n`);
      } catch (error) {
        toolClients = toolClients.filter((c) => c !== client);
      }
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("[ERROR] Failed to store tool definitions:", error);
    res.status(500).json({ error: "Failed to store tool definitions" });
  }
});

// Server sent events (SSE) Model name endpoint
app.get("/api/inspection/model", async (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  res.flushHeaders();

  modelClients.push(res);

  res.write(`data: ${JSON.stringify({ model: currentModel })}\n\n`);

  req.on("close", () => {
    modelClients = modelClients.filter((client) => client !== res);
    res.end();
    console.log("Model SSE Client disconnected");
  });
});

// HTTP endpoint for agent to send model name updates
app.post("/api/inspection/model", async (req: Request, res: Response) => {
  try {
    const { model } = req.body;
    
    if (typeof model !== "string") {
      return res.status(400).json({ error: "Model must be a string" });
    }

    currentModel = model;

    modelClients.forEach((client) => {
      try {
        client.write(`data: ${JSON.stringify({ model: currentModel })}\n\n`);
      } catch (error) {
        modelClients = modelClients.filter((c) => c !== client);
      }
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("[ERROR] Failed to send model name update:", error);
    res.status(500).json({ error: "Failed to send model name update" });
  }
});

// Start the server
app.listen(3003, () => {
  console.log(`Inspection server running on http://localhost:3003`);
  console.log("Listening for requests...");
});

