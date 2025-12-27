import "dotenv/config";
import express from "express";
import cors from "cors";
import { Request, Response } from "express";

const app = express();

// Fixed host/port (keep stable for local usage + Docker compose).
// Note: we still bind to 0.0.0.0 so the container port is reachable from your machine.
const HOST = "0.0.0.0";
const PORT = 6969;

const allowedOrigins = ["http://localhost:5555", "http://127.0.0.1:5555"];

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
let agentStatusClients: Response[] = [];

// Store current state
let currentContext: unknown[] = [];
let currentTokenUsage = {
  totalTokens: 0,
  contextLimit: null as number | null,
  remainingTokens: null as number | null,
};
let toolDefinitions: unknown[] = [];
// Store model name
let currentModel: string = "";
// Track last agent activity
let lastAgentActivity: number | null = null;
const AGENT_TIMEOUT_MS = 10000; // Consider agent disconnected after 10 seconds of inactivity
let lastBroadcastedStatus: boolean | null = null;

// Helper function to initialize SSE response
function initSSE(res: Response) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
}

// Server sent events (SSE) Inspection trace endpoint
app.get("/api/inspection/trace", (req: Request, res: Response) => {
  initSSE(res);
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
app.post("/api/inspection/trace", (req: Request, res: Response) => {
  try {
    const { event } = req.body;
    
    if (!event) {
      return res.status(400).json({ error: "Event is required" });
    }

    // Update agent activity timestamp
    const wasConnected = isAgentConnected();
    lastAgentActivity = Date.now();
    const isConnected = isAgentConnected();

    // Notify status clients if connection status changed
    if (wasConnected !== isConnected) {
      broadcastAgentStatus();
    }

    const payload = JSON.stringify(event);

    inspectionClients.forEach((client) => {
      try {
        client.write(`data: ${payload}\n\n`);
      } catch {
        try { client.end(); } catch {}
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
app.get("/api/inspection/context", (req: Request, res: Response) => {
  initSSE(res);
  contextClients.push(res);

  res.write(`data: ${JSON.stringify(currentContext)}\n\n`);

  req.on("close", () => {
    contextClients = contextClients.filter((client) => client !== res);
    res.end();
    console.log("Context SSE Client disconnected");
  });
});

// REST GET endpoint to fetch current context
app.get("/api/inspection/context/current", (req: Request, res: Response) => {
  try {
    res.status(200).json(currentContext);
  } catch (error) {
    console.error("[ERROR] Failed to fetch context:", error);
    res.status(500).json({ error: "Failed to fetch context" });
  }
});

// HTTP endpoint for agent to send context updates
app.post("/api/inspection/context", (req: Request, res: Response) => {
  try {
    const { context } = req.body;
    
    if (!Array.isArray(context)) {
      return res.status(400).json({ error: "Context must be an array" });
    }

    // Update agent activity timestamp
    lastAgentActivity = Date.now();

    // Store the context
    currentContext = context;

    contextClients.forEach((client) => {
      try {
        client.write(`data: ${JSON.stringify(context)}\n\n`);
      } catch {
        try { client.end(); } catch {}
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
app.get("/api/inspection/tokens", (req: Request, res: Response) => {
  initSSE(res);
  tokenClients.push(res);

  res.write(`data: ${JSON.stringify(currentTokenUsage)}\n\n`);

  req.on("close", () => {
    tokenClients = tokenClients.filter((client) => client !== res);
    res.end();
    console.log("Token SSE Client disconnected");
  });
});

// REST GET endpoint to fetch current token usage
app.get("/api/inspection/tokens/current", (req: Request, res: Response) => {
  try {
    res.status(200).json(currentTokenUsage);
  } catch (error) {
    console.error("[ERROR] Failed to fetch token usage:", error);
    res.status(500).json({ error: "Failed to fetch token usage" });
  }
});

// HTTP endpoint for agent to send token usage updates
app.post("/api/inspection/tokens", (req: Request, res: Response) => {
  try {
    const { currentUsage, maxTokens } = req.body;

    if (typeof currentUsage !== "number" || (maxTokens !== null && typeof maxTokens !== "number")) {
      return res.status(400).json({ error: "currentUsage and maxTokens must be numbers (maxTokens may be null)" });
    }

    if (currentUsage < 0) {
      return res.status(400).json({ error: "currentUsage must be >= 0" });
    }

    // Update agent activity timestamp
    lastAgentActivity = Date.now();

    const tokenUsage = {
      totalTokens: currentUsage,
      contextLimit: maxTokens,
      remainingTokens: maxTokens !== null ? Math.max(0, maxTokens - currentUsage) : null,
    };

    // Store the token usage
    currentTokenUsage = tokenUsage;

    tokenClients.forEach((client) => {
      try {
        client.write(`data: ${JSON.stringify(tokenUsage)}\n\n`);
      } catch {
        try { client.end(); } catch {}
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
app.get("/api/inspection/tools", (req: Request, res: Response) => {
  initSSE(res);
  toolClients.push(res);

  res.write(`data: ${JSON.stringify(toolDefinitions)}\n\n`);

  req.on("close", () => {
    toolClients = toolClients.filter((client) => client !== res);
    res.end();
    console.log("Tool definitions SSE Client disconnected");
  });
});

// REST GET endpoint to fetch current tool definitions
app.get("/api/inspection/tools/current", (req: Request, res: Response) => {
  try {
    res.status(200).json(toolDefinitions);
  } catch (error) {
    console.error("[ERROR] Failed to fetch tool definitions:", error);
    res.status(500).json({ error: "Failed to fetch tool definitions" });
  }
});

// HTTP endpoint for agent to send tool definitions
app.post("/api/inspection/tools", (req: Request, res: Response) => {
  try {
    const { toolDefinitions: tools } = req.body;
    
    if (!Array.isArray(tools)) {
      return res.status(400).json({ error: "Tool definitions must be an array" });
    }

    // Update agent activity timestamp
    lastAgentActivity = Date.now();

    toolDefinitions = tools;

    toolClients.forEach((client) => {
      try {
        client.write(`data: ${JSON.stringify(toolDefinitions)}\n\n`);
      } catch {
        try { client.end(); } catch {}
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
app.get("/api/inspection/model", (req: Request, res: Response) => {
  initSSE(res);
  modelClients.push(res);

  res.write(`data: ${JSON.stringify({ model: currentModel })}\n\n`);

  req.on("close", () => {
    modelClients = modelClients.filter((client) => client !== res);
    res.end();
    console.log("Model SSE Client disconnected");
  });
});

// HTTP endpoint for agent to send model name updates
app.post("/api/inspection/model", (req: Request, res: Response) => {
  try {
    const { model } = req.body;
    
    if (typeof model !== "string") {
      return res.status(400).json({ error: "Model must be a string" });
    }

    // Update agent activity timestamp
    lastAgentActivity = Date.now();

    currentModel = model;

    modelClients.forEach((client) => {
      try {
        client.write(`data: ${JSON.stringify({ model: currentModel })}\n\n`);
      } catch {
        try { client.end(); } catch {}
        modelClients = modelClients.filter((c) => c !== client);
      }
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("[ERROR] Failed to send model name update:", error);
    res.status(500).json({ error: "Failed to send model name update" });
  }
});

// Helper function to check if agent is connected
function isAgentConnected(): boolean {
  if (lastAgentActivity === null) return false;
  return Date.now() - lastAgentActivity < AGENT_TIMEOUT_MS;
}

// Helper function to broadcast agent status to all connected clients
function broadcastAgentStatus() {
  const status = { connected: isAgentConnected() };
  agentStatusClients.forEach((client) => {
    try {
      client.write(`data: ${JSON.stringify(status)}\n\n`);
    } catch {
      try { client.end(); } catch {}
      agentStatusClients = agentStatusClients.filter((c) => c !== client);
    }
  });
}

// Server sent events (SSE) Agent status endpoint
app.get("/api/inspection/agent-status", (req: Request, res: Response) => {
  initSSE(res);
  agentStatusClients.push(res);

  // Send initial status
  const status = { connected: isAgentConnected() };
  res.write(`data: ${JSON.stringify(status)}\n\n`);

  req.on("close", () => {
    agentStatusClients = agentStatusClients.filter((client) => client !== res);
    res.end();
    console.log("Agent status SSE Client disconnected");
  });
});

// Periodically check agent connection status and broadcast updates only on change
setInterval(() => {
  const currentStatus = isAgentConnected();
  if (currentStatus !== lastBroadcastedStatus) {
    broadcastAgentStatus();
    lastBroadcastedStatus = currentStatus;
  }
}, 2000);

// Start the server
app.listen(PORT, HOST, () => {
  console.log(`Inspection server running on http://localhost:${PORT}`);
  console.log("Listening for requests...");
});

