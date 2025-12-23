import "dotenv/config";
import express from "express";
import cors from "cors";
import { Request, Response } from "express";

const app = express();

// Fixed host/port (keep stable for local usage + Docker compose).
// Note: we still bind to 0.0.0.0 so the container port is reachable from your machine.
const HOST = "0.0.0.0";
const PORT = 6969;

const allowedOrigins = ["http://localhost:5173", "http://127.0.0.1:5173"];

const corsOptions: cors.CorsOptions = {
  origin: (origin, cb) => {
    // Allow same-origin / non-browser clients (no Origin header)
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes("*")) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked origin: ${origin}`));
  },
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

// Server sent events (SSE) Inspection trace endpoint
app.get("/api/inspection/trace", async (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  res.flushHeaders();

  inspectionClients.push(res);

  // Send initial connection message to help Safari detect connection
  res.write("data: {\"message\":\"connected\"}\n\n");

  req.on("close", () => {
    inspectionClients = inspectionClients.filter((client) => client !== res);
    res.end();
    console.log("Inspection SSE Client disconnected");
  });
});

// HTTP endpoint for agent to send inspection trace events
app.post("/api/inspection/trace", async (req: Request, res: Response) => {
  try {
    const { event } = req.body;
    
    if (!event) {
      return res.status(400).json({ error: "Event is required" });
    }

    const payload = JSON.stringify(event);

    inspectionClients.forEach((client) => {
      try {
        client.write(`data: ${payload}\n\n`);
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
app.listen(PORT, HOST, () => {
  console.log(`Inspection server running on http://localhost:${PORT}`);
  console.log("Listening for requests...");
});

