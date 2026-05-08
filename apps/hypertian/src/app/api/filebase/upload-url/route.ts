import { createFilebasePresignedUpload } from '@/lib/filebase';
import { fail, ok } from '@/lib/http';
import { z } from 'zod';

const schema = z.object({
  fileName: z.string().min(1).max(160),
  contentType: z.string().min(1).max(80),
  fileSize: z.number().int().positive(),
});

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const upload = await createFilebasePresignedUpload(body);
    return ok(upload);
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Failed to create Filebase upload URL.', 400);
  }
}
