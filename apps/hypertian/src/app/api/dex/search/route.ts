import { searchDexPairs } from '@/lib/dexscreener';
import { fail, ok } from '@/lib/http';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get('q');
    if (!query) {
      return fail('Missing query.');
    }
    const results = await searchDexPairs(query);
    return ok({ results });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Failed to search DexScreener.');
  }
}
