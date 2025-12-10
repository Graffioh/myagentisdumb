import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { AgentRequest, AgentResponse } from "./types";
import { Request, Response } from "express";

dotenv.config();

const app = express();

const corsOptions = {
  origin: "http://localhost:5173",
  methods: ["GET", "POST"],
};

app.use(cors(corsOptions));

app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

const SYSTEM_PROMPT = `
You are a helpful assistant that can answer questions and help with tasks.
Your response should be concise and to the point.`.trim();

let CONTEXT: string[] = [];

function buildPrompt(prompt: string) {
  // Add the system prompt only on first turn (the context right now is not being cleared)
  const prefix = CONTEXT.length === 0 ? `${SYSTEM_PROMPT}\n\n` : "";
  const history = CONTEXT.length > 0 ? CONTEXT.join("\n") + "\n\n" : "";
  return `${prefix}${history}User: ${prompt}\nAssistant:`;
}

app.post("/api/agent", async (req: Request<AgentRequest>, res: Response<AgentResponse>) => {
  try {
    const { prompt } = req.body;
    const inputPrompt = buildPrompt(prompt);

    const result = await model.generateContent(inputPrompt);
    const assistantText = result.response.text().trim();

    CONTEXT.push(`User: ${prompt}`);
    CONTEXT.push(`Assistant: ${assistantText}`);
    console.log(`Response generated (${assistantText.length} characters)`);

    res.json({ text: assistantText });
  } catch (error) {
    console.error("[ERROR]", error);
    res.status(500).send("Agent error");
  }
});

app.listen(3002, () => {
  console.log("Agent backend running on http://localhost:3002");
  console.log("Listening for requests...");
});
