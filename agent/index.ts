import "dotenv/config";
import express from "express";
import cors from "cors";
import { AgentRequest, AgentResponse } from "./types";
import { Request, Response } from "express";
import { runLoop, clearContext } from "./loop";
import { clearInspectionClient, setInspectionClient, clearContextClient, setContextClient } from "./sse-client";

const app = express();

const corsOptions = {
  origin: "http://localhost:5173",
  methods: ["GET", "POST", "DELETE"],
};

app.use(cors(corsOptions));

app.use(express.json());

// Agent loop endpoint
app.post("/api/agent", async (req: Request<AgentRequest>, res: Response<AgentResponse>) => {
  try {
    const { prompt } = req.body;

    const assistantText = await runLoop(prompt);
    res.json({ text: assistantText });
  } catch (error) {
    console.error("[ERROR]", error);
    res.status(500).send("Agent error");
  }
});

// Server sent events (SSE) Inspection events endpoint
app.get("/api/agent/events/inspection", async (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  res.flushHeaders();

  setInspectionClient(res);

  res.write("data: Connected to Agent Inspection Channel!\n\n");

  req.on("close", () => {
    clearInspectionClient();
    res.end();
    console.log("Inspection SSE Client disconnected");
  });
});

// Server sent events (SSE) Context events endpoint
app.get("/api/agent/events/context", async (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  res.flushHeaders();

  setContextClient(res);

  res.write("data: []\n\n");

  req.on("close", () => {
    clearContextClient();
    res.end();
    console.log("Context SSE Client disconnected");
  });
});

// Delete context endpoint
app.delete("/api/agent/context", async (req: Request, res: Response) => {
  try {
    clearContext();
    res.status(200).json({ message: "Context cleared" });
  } catch (error) {
    console.error("[ERROR] Failed to clear context:", error);
    res.status(500).send("Failed to clear context");
  }
});

// Start the server
app.listen(3002, () => {
  console.log("Agent backend running on http://localhost:3002");
  console.log("Listening for requests...");
});
