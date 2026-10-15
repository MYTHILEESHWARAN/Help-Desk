import { z } from "zod";

export const TriageResponseSchema = z.object({
  category:   z.enum(["hardware","network","software","account-access"]),
  priority:   z.enum(["low","medium","high","urgent"]),
  confidence: z.number().min(0).max(1),
  reason:     z.string(),
});

export const SimilarTicketSchema = z.object({
  id:              z.string(),
  title:           z.string(),
  status:          z.string(),
  resolution_note: z.string().nullable().optional(),
});

export const NlQueryResponseSchema = z.object({
  sql:    z.string(),
  answer: z.unknown(),
});

export type TriageResponse  = z.infer<typeof TriageResponseSchema>;
export type SimilarTicket   = z.infer<typeof SimilarTicketSchema>;
