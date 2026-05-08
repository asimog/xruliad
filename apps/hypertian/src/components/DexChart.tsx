'use client';

interface DexChartProps {
  tokenAddress: string;
  chain?: string;
  width?: number;
  height?: number;
  theme?: 'dark' | 'light';
}

/**
 * Renders the official DexScreener embed iframe for a given token address.
 * Uses the public embed URL: https://dexscreener.com/<chain>/<tokenAddress>?embed=1
 */
export default function DexChart({
  tokenAddress,
  chain = 'solana',
  width = 420,
  height = 240,
  theme = 'dark',
}: DexChartProps) {
  if (!tokenAddress) {
    return null;
  }

  const src = `https://dexscreener.com/${chain}/${tokenAddress}?embed=1&theme=${theme}&trades=0&info=0`;

  return (
    <div
      className="overflow-hidden rounded-xl"
      style={{ width, height }}
    >
      <iframe
        allow="clipboard-write"
        className="h-full w-full border-0"
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox="allow-scripts allow-same-origin allow-popups"
        src={src}
        title={`DexScreener chart for ${tokenAddress}`}
      />
    </div>
  );
}
