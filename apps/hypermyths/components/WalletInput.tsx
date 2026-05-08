"use client";

interface WalletInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function WalletInput({ value, onChange, disabled }: WalletInputProps) {
  return (
    <div className="field">
      <span>Token Mint / Contract Address</span>
      <input
        id="wallet-address"
        type="text"
        inputMode="text"
        autoComplete="off"
        spellCheck={false}
        placeholder="Paste Solana mint or EVM contract..."
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value.trim())}
      />
      <p className="route-summary compact">
        One address is enough. We enrich Solana and EVM tokens with market context before writing the trailer.
      </p>
    </div>
  );
}
