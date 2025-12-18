import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export const runNeofetch = async () => {
  try {
    const { stdout, stderr } = await execAsync("neofetch");
    
    if (stderr) {
      // neofetch sometimes writes to stderr even on success, so we check if stdout has content
      if (!stdout) {
        throw new Error(`neofetch error: ${stderr}`);
      }
    }
    
    return {
      output: stdout || stderr,
      success: true
    };
  } catch (error: any) {
    // Handle case where neofetch is not installed
    if (error.code === "ENOENT" || error.message.includes("neofetch: command not found")) {
      return {
        output: "neofetch is not installed on this system. Please install it to use this tool.",
        success: false,
        error: "neofetch not found"
      };
    }
    
    return {
      output: `Error running neofetch: ${error.message}`,
      success: false,
      error: error.message
    };
  }
};

