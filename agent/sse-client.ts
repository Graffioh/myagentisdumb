import type { Response } from "express";

let sseClient: Response | null = null;

export function setSSEClient(res: Response) {
    sseClient = res;
}

export function clearSSEClient() {
    sseClient = null;
}

export function sendSSEMessage(message: string) {
    if (sseClient) {
        sseClient.write(`data: ${message}\n\n`);
    }
}