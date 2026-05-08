import { fail, ok } from '@/lib/http';
import { verifyPendingPaymentsBatch } from '@/lib/payments';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return fail('Unauthorized.', 401);
    }

    const summary = await verifyPendingPaymentsBatch(25);
    return ok({
      status: 'ok',
      ...summary,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Failed to process pending payments.', 500);
  }
}
