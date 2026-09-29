import { z } from "zod";
import { parseCsvInputs } from "./csv";
import { testInputSchema, type TestInput } from "./schemas";

const submissionSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("url"), url: z.string(), name: z.string().optional(), allowDuplicates: z.boolean().optional() }).strict(),
  z.object({ mode: z.literal("manual"), name: z.string(), url: z.string().optional(), location: z.string().optional(), activity: z.string().optional(), summary: z.string().optional(), sourceNote: z.string().optional(), allowDuplicates: z.boolean().optional() }).strict(),
  z.object({ mode: z.literal("csv"), csvText: z.string(), allowDuplicates: z.boolean().optional() }).strict(),
]);

export function parseSubmission(raw: unknown): { inputs: TestInput[]; allowDuplicates: boolean } {
  const submission = submissionSchema.parse(raw);
  if (submission.mode === "csv") return { inputs: parseCsvInputs(submission.csvText), allowDuplicates: !!submission.allowDuplicates };
  if (submission.mode === "url") return { inputs: [testInputSchema.parse({ type: "url", url: submission.url, name: submission.name || "" })], allowDuplicates: !!submission.allowDuplicates };
  return {
    inputs: [testInputSchema.parse({
      type: "manual",
      name: submission.name,
      url: submission.url || "",
      location: submission.location || "",
      activity: submission.activity || "",
      summary: submission.summary || "",
      sourceNote: submission.sourceNote || "",
    })],
    allowDuplicates: !!submission.allowDuplicates,
  };
}
