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

    // Broadcast to all connected inspection clients
    const lines = String(message).split(/\r?\n/);
    inspectionClients.forEach((client) => {
      try {
        for (const line of lines) {
          client.write(`data: ${line}\n`);
        }
        client.write(`\n`);
      } catch (error) {
        // Remove dead clients
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

    // Broadcast to all connected context clients
    contextClients.forEach((client) => {
      try {
        client.write(`data: ${JSON.stringify(context)}\n\n`);
      } catch (error) {
        // Remove dead clients
        contextClients = contextClients.filter((c) => c !== client);
      }
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("[ERROR] Failed to send context update:", error);
    res.status(500).json({ error: "Failed to send context update" });
  }
});

// Start the server
app.listen(3003, () => {
  console.log(`Inspection server running on http://localhost:3003`);
  console.log("Listening for requests...");
});

