import 'server-only';

interface PumpTokenResponse {
  creator?: string | null;
  wallet?: string | null;
}

export async function getPumpCreatorWallet(mint: string) {
  const response = await fetch(`https://pumptrader.fun/tokens/${encodeURIComponent(mint)}`, {
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    return null;
  }

  const json = (await response.json()) as PumpTokenResponse;
  return json.creator || json.wallet || null;
}
