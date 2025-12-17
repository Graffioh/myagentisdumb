const INSPECTION_URL = process.env.INSPECTION_URL || "http://localhost:3003";

export async function sendInspectionMessage(message: string) {
    console.log("Sending inspection message:", message);
    try {
        const response = await fetch(`${INSPECTION_URL}/api/inspection/messages`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ message }),
        });

        if (!response.ok) {
            console.error(`Failed to send inspection message: ${response.statusText}`);
        }
    } catch (error) {
        console.error("Error sending inspection message:", error);
    }
}

export async function sendContextUpdate(context: any[]) {
    console.log("Sending context update:", JSON.stringify(context));
    try {
        const response = await fetch(`${INSPECTION_URL}/api/inspection/context`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ context }),
        });

        if (!response.ok) {
            console.error(`Failed to send context update: ${response.statusText}`);
        }
    } catch (error) {
        console.error("Error sending context update:", error);
    }
}