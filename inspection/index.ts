import "dotenv/config";
import express from "express";
import cors from "cors";
import { Request, Response } from "express";
import { randomUUID } from "crypto";
import { InspectionEventLabel, SSEEventType, type InspectionEvent, type SSEEvent } from "../protocol/types";

const app = express();

const HOST = "0.0.0.0";
const PORT = 6969;

const allowedOrigins = ["http://localhost:5555", "http://127.0.0.1:5555"];

const corsOptions: cors.CorsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes("*")) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked origin: ${origin}`));
  },
  methods: ["GET", "POST"],
};

app.use(cors(corsOptions));
app.use(express.json());

let sseClients: Response[] = [];

let currentContext: unknown[] = [];
let currentTokenUsage = {
  totalTokens: 0,
  contextLimit: null as number | null,
  remainingTokens: null as number | null,
};
let toolDefinitions: unknown[] = [];
let currentModel: string = "";
let lastAgentActivity: number | null = null;
const AGENT_TIMEOUT_MS = 10000;
let lastBroadcastedStatus: boolean | null = null;
let currentInvocationId: string | null = null;

function initSSE(res: Response) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
}

function broadcast(event: SSEEvent) {
  const payload = JSON.stringify(event);
  sseClients.forEach((client) => {
    try {
      client.write(`data: ${payload}\n\n`);
    } catch {
      try { client.end(); } catch {}
      sseClients = sseClients.filter((c) => c !== client);
    }
  });
}

function isAgentConnected(): boolean {
  if (lastAgentActivity === null) return false;
  return Date.now() - lastAgentActivity < AGENT_TIMEOUT_MS;
}

function broadcastAgentStatus() {
  broadcast({ type: SSEEventType.AgentStatus, payload: { connected: isAgentConnected() } });
}

app.get("/api/inspection/events", (req: Request, res: Response) => {
  initSSE(res);
  sseClients.push(res);

  const initEvents: SSEEvent[] = [
    { type: SSEEventType.Trace, payload: { message: "connected" } },
    { type: SSEEventType.Context, payload: currentContext as SSEEvent extends { type: SSEEventType.Context; payload: infer P } ? P : never },
    { type: SSEEventType.Tokens, payload: currentTokenUsage },
    { type: SSEEventType.Tools, payload: toolDefinitions as SSEEvent extends { type: SSEEventType.Tools; payload: infer P } ? P : never },
    { type: SSEEventType.Model, payload: { model: currentModel } },
    { type: SSEEventType.AgentStatus, payload: { connected: isAgentConnected() } },
  ];

  for (const event of initEvents) {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  }

  req.on("close", () => {
    sseClients = sseClients.filter((client) => client !== res);
    res.end();
    console.log("SSE Client disconnected");
  });
});

app.post("/api/inspection/events", (req: Request, res: Response) => {
  try {
    const { type, payload } = req.body as { type: SSEEventType; payload: unknown };

    if (!type || payload === undefined) {
      return res.status(400).json({ error: "type and payload are required" });
    }

    const wasConnected = isAgentConnected();
    lastAgentActivity = Date.now();
    const isConnected = isAgentConnected();
    if (wasConnected !== isConnected) {
      broadcastAgentStatus();
    }

    switch (type) {
      case SSEEventType.Trace: {
        const event = payload as InspectionEvent;
        
        const hasInvocationStart = event.children?.some(
          (child) => child.label === InspectionEventLabel.InvocationStart
        );
        if (hasInvocationStart) {
          currentInvocationId = randomUUID();
        }

        const enrichedEvent: InspectionEvent = {
          ...event,
          invocationId: currentInvocationId ?? undefined,
        };

        broadcast({ type: SSEEventType.Trace, payload: enrichedEvent });
        break;
      }

      case SSEEventType.Context: {
        const context = payload as unknown[];
        if (!Array.isArray(context)) {
          return res.status(400).json({ error: "Context must be an array" });
        }
        currentContext = context;
        broadcast({ type: SSEEventType.Context, payload: context as SSEEvent extends { type: SSEEventType.Context; payload: infer P } ? P : never });
        break;
      }

      case SSEEventType.Tokens: {
        const { currentUsage, maxTokens } = payload as { currentUsage: number; maxTokens: number | null };
        if (typeof currentUsage !== "number" || (maxTokens !== null && typeof maxTokens !== "number")) {
          return res.status(400).json({ error: "currentUsage and maxTokens must be numbers (maxTokens may be null)" });
        }
        if (currentUsage < 0) {
          return res.status(400).json({ error: "currentUsage must be >= 0" });
        }
        currentTokenUsage = {
          totalTokens: currentUsage,
          contextLimit: maxTokens,
          remainingTokens: maxTokens !== null ? Math.max(0, maxTokens - currentUsage) : null,
        };
        broadcast({ type: SSEEventType.Tokens, payload: currentTokenUsage });
        break;
      }

      case SSEEventType.Tools: {
        const tools = payload as unknown[];
        if (!Array.isArray(tools)) {
          return res.status(400).json({ error: "Tool definitions must be an array" });
        }
        toolDefinitions = tools;
        broadcast({ type: SSEEventType.Tools, payload: tools as SSEEvent extends { type: SSEEventType.Tools; payload: infer P } ? P : never });
        break;
      }

      case SSEEventType.Model: {
        const { model } = payload as { model: string };
        if (typeof model !== "string") {
          return res.status(400).json({ error: "Model must be a string" });
        }
        currentModel = model;
        broadcast({ type: SSEEventType.Model, payload: { model: currentModel } });
        break;
      }

      default:
        return res.status(400).json({ error: `Unknown event type: ${type}` });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("[ERROR] Failed to process event:", error);
    res.status(500).json({ error: "Failed to process event" });
  }
});

app.get("/api/inspection/context/current", (req: Request, res: Response) => {
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json(currentContext);
});

app.get("/api/inspection/tokens/current", (req: Request, res: Response) => {
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json(currentTokenUsage);
});

app.get("/api/inspection/tools/current", (req: Request, res: Response) => {
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json(toolDefinitions);
});

app.post("/api/inspection/evaluate", async (req: Request, res: Response) => {
  try {
    const { userQuery, agentResponse } = req.body as { userQuery: string; agentResponse: string };

    if (!userQuery || !agentResponse) {
      return res.status(400).json({ error: "userQuery and agentResponse are required" });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "OPENROUTER_API_KEY not configured" });
    }

    const evaluationPrompt = `You are an expert evaluator assessing the quality of an AI assistant's response.

USER QUERY:
${userQuery}

AGENT RESPONSE:
${agentResponse}

Evaluate the response on these criteria (1-10 scale):
1. Correctness - Is the information accurate?
2. Completeness - Does it fully address the query?
3. Clarity - Is it clear and well-structured?
4. Relevance - Does it stay on topic?
5. Helpfulness - Does it actually help the user?

Respond ONLY with valid JSON in this exact format:
{
  "scores": {
    "correctness": <number>,
    "completeness": <number>,
    "clarity": <number>,
    "relevance": <number>,
    "helpfulness": <number>
  },
  "overallScore": <number>,
  "summary": "<brief overall assessment>",
  "strengths": ["<strength1>", "<strength2>"],
  "weaknesses": ["<weakness1>", "<weakness2>"],
  "suggestions": ["<suggestion1>", "<suggestion2>"]
}`;

    const llmResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [{ role: "user", content: evaluationPrompt }],
        temperature: 0.3,
      }),
    });

    if (!llmResponse.ok) {
      const errorText = await llmResponse.text();
      console.error("[evaluate] LLM API error:", errorText);
      return res.status(500).json({ error: "LLM evaluation failed" });
    }

    const llmData = await llmResponse.json() as { choices: { message: { content: string } }[] };
    const content = llmData.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(500).json({ error: "No response from LLM" });
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: "Could not parse LLM response" });
    }

    const evaluation = JSON.parse(jsonMatch[0]);
    res.status(200).json({ evaluation });
  } catch (error) {
    console.error("[evaluate] Error:", error);
    res.status(500).json({ error: "Evaluation failed" });
  }
});

setInterval(() => {
  const currentStatus = isAgentConnected();
  if (currentStatus !== lastBroadcastedStatus) {
    broadcastAgentStatus();
    lastBroadcastedStatus = currentStatus;
  }
}, 2000);

app.listen(PORT, HOST, () => {
  console.log(`Inspection server running on http://localhost:${PORT}`);
  console.log("Listening for requests...");
});
