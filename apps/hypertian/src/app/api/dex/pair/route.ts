import { getPair, getPairsByTokenAddress } from '@/lib/dexscreener';
import { fail, ok } from '@/lib/http';
import { SupportedChain } from '@/lib/types';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const chain = (url.searchParams.get('chain') || 'solana') as SupportedChain;
    const pairAddress = url.searchParams.get('pair');
    const token = url.searchParams.get('token');

    if (pairAddress) {
      const pair = await getPair(chain, pairAddress);
      return ok({ pair });
    }

    if (!token) {
      return fail('Missing token or pair parameter.');
    }

    const pairs = await getPairsByTokenAddress(chain, token);
    if (!pairs.length) {
      return fail('No pair found.', 404);
    }
    return ok({ pair: pairs[0] });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Failed to load pair.');
  }
}
