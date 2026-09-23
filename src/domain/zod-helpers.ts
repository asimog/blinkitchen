import type { z } from "zod";

/** Compact, human-readable issue list for validation failures. */
export function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("; ");
}
