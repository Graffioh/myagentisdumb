import "dotenv/config";
import express from "express";
import cors from "cors";
import { AgentRequest, AgentResponse } from "./types";
import { Request, Response } from "express";
import { runLoop, clearContext, getContext } from "./loop";

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

// Get context endpoint
app.get("/api/agent/context", async (req: Request, res: Response) => {
  try {
    const currentContext = getContext();
    res.status(200).json(currentContext);
  } catch (error) {
    console.error("[ERROR] Failed to get context:", error);
    res.status(500).send("Failed to get context");
  }
});

// Delete context endpoint
app.delete("/api/agent/context", async (req: Request, res: Response) => {
  try {
    await clearContext();
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
