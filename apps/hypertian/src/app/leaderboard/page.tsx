import { Metadata } from 'next';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Leaderboard',
  description: 'Top 10 streamers by income and top 10 advertisers by spend on Hypertian.',
};

interface PaymentWithAdAndStream {
  id: string;
  amount: number;
  streamer_amount: number | null;
  ads: {
    stream_id: string;
    sponsor_wallet: string | null;
    stream: {
      display_name: string | null;
      payout_wallet: string | null;
    } | null;
  } | null;
}

export default async function LeaderboardPage() {
  const supabase = createAdminClient();

  const { data: payments, error } = await supabase
    .from('payments')
    .select(`
      id,
      amount,
      streamer_amount,
      status,
      ads!inner(
        stream_id,
        sponsor_wallet,
        stream!inner(
          display_name,
          payout_wallet
        )
      )
    `)
    .eq('status', 'verified');

  if (error) {
    console.error('Failed to fetch payments for leaderboard:', error);
    // Continue with empty data
  }

  const records: PaymentWithAdAndStream[] = (payments as unknown as PaymentWithAdAndStream[]) ?? [];

  // Aggregate streamer income
  const streamTotals = new Map<string, { name: string; total: number }>();
  for (const p of records) {
    const ad = p.ads;
    if (!ad || !ad.stream) continue;
    const streamId = ad.stream_id;
    const displayName = ad.stream.display_name ?? 'Unnamed Streamer';
    const value = p.streamer_amount ?? p.amount;
    const current = streamTotals.get(streamId);
    streamTotals.set(streamId, { name: displayName, total: (current?.total ?? 0) + value });
  }

  const topStreamers = Array.from(streamTotals.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // Aggregate advertiser spend
  const advertiserTotals = new Map<string, number>();
  for (const p of records) {
    const ad = p.ads;
    if (!ad || !ad.sponsor_wallet) continue;
    const wallet = ad.sponsor_wallet;
    const current = advertiserTotals.get(wallet) ?? 0;
    advertiserTotals.set(wallet, current + p.amount);
  }

  const topAdvertisers = Array.from(advertiserTotals.entries())
    .map(([wallet, total]) => ({
      wallet,
      total,
      short: wallet.slice(0, 6) + '…' + wallet.slice(-4),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  return (
    <div className="grid gap-8">
      <header>
        <div className="text-[11px] uppercase tracking-[0.32em] text-[var(--color-accent)]">Leaderboard</div>
        <h1 className="mt-1 text-3xl font-semibold text-white md:text-5xl">
          Top streamers & advertisers
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--color-copy-soft)]">
          Highest-earning streamers and biggest-spending advertisers ranked by total verified payments.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Streamers */}
        <section className="panel rounded-3xl p-5">
          <h2 className="text-[11px] uppercase tracking-[0.28em] text-[var(--color-accent)]">
            Top Streamers
          </h2>
          <p className="mt-0.5 text-sm text-[var(--color-copy-soft)]">
            Ranked by total income from verified payments.
          </p>
          <div className="mt-4 space-y-2">
            {topStreamers.length === 0 ? (
              <p className="text-sm text-[var(--color-copy-faint)]">No data yet.</p>
            ) : (
              <ol className="space-y-1">
                {topStreamers.map((stream, idx) => (
                  <li
                    key={idx}
                    className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-sm"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-accent)] text-[10px] font-bold text-black">
                        {idx + 1}
                      </span>
                      <span className="text-white">{stream.name}</span>
                    </span>
                    <span className="font-mono text-[var(--color-copy-soft)]">{stream.total.toFixed(2)} SOL</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>

        {/* Top Advertisers */}
        <section className="panel rounded-3xl p-5">
          <h2 className="text-[11px] uppercase tracking-[0.28em] text-[var(--color-accent)]">
            Top Advertisers
          </h2>
          <p className="mt-0.5 text-sm text-[var(--color-copy-soft)]">
            Ranked by total spend on verified payments.
          </p>
          <div className="mt-4 space-y-2">
            {topAdvertisers.length === 0 ? (
              <p className="text-sm text-[var(--color-copy-faint)]">No data yet.</p>
            ) : (
              <ol className="space-y-1">
                {topAdvertisers.map((adv, idx) => (
                  <li
                    key={idx}
                    className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-sm"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-accent)] text-[10px] font-bold text-black">
                        {idx + 1}
                      </span>
                      <span className="font-mono text-[var(--color-copy-soft)]">{adv.short}</span>
                    </span>
                    <span className="font-mono text-white">{adv.total.toFixed(2)} SOL</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
