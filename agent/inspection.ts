/*
    Inspection Wire - Wire with the Inspection HTTP client for sending events to the inspection server.
*/

import { createHttpInspectionReporter } from "../reporter/inspection";
import type { InspectionReporter } from "../reporter/types";

export { createHttpInspectionReporter };
export type { InspectionReporter };

const INSPECTION_URL = process.env.INSPECTION_URL || "http://localhost:3003";
export const inspectionReporter: InspectionReporter = createHttpInspectionReporter(INSPECTION_URL);