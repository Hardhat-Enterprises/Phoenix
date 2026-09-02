import { z } from "zod";

export const ingestionSchema = z.object({
  event_id: z.string().uuid("event_id must be a valid UUID"),
  timestamp: z.string().datetime("timestamp must be a valid ISO datetime"),
  event_type: z.enum(["hazard", "cyber"]),
  source: z.string().min(1).max(100),
  location: z.object({
    state: z.string().min(1),
    region: z.string().min(1),
  }),
  payload: z.record(z.string(), z.any()),
});