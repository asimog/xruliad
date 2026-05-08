import { z } from 'zod';
import { fail, ok } from '@/lib/http';
import { createFeedback } from '@/lib/supabase/anon-queries';

export const dynamic = 'force-dynamic';

const schema = z.object({
  category: z.enum(['bug', 'ad-issue', 'feature', 'other']),
  message: z.string().min(5).max(4000),
  email: z.string().email().optional().or(z.literal('').transform(() => undefined)),
  contextUrl: z.string().url().optional().or(z.literal('').transform(() => undefined)),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const record = await createFeedback({
      category: body.category,
      message: body.message,
      email: body.email ?? null,
      contextUrl: body.contextUrl ?? null,
    });
    return ok({ feedback: record });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Failed to submit feedback.', 400);
  }
}
