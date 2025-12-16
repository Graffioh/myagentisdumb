import type { Response } from "express";

let sseClient: Response | null = null;

export function setSSEClient(res: Response) {
    sseClient = res;
}

export function clearSSEClient() {
    sseClient = null;
}

export function sendInspectionMessage(message: string) {
    if (sseClient) {
        const lines = message.split(/\r?\n/);
        for (const line of lines) {
            sseClient.write(`data: ${line}\n`);
        }
        sseClient.write(`\n`);
    }
}