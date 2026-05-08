'use client';

import { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';

export function CopyButton({
  value,
  label = 'Copy',
  className = 'secondary-button',
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timeout = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      aria-label={copied ? `${label} copied` : label}
      className={className}
      onClick={() => void handleCopy()}
      type="button"
    >
      {copied ? <Check aria-hidden="true" className="h-4 w-4" /> : <Copy aria-hidden="true" className="h-4 w-4" />}
      {copied ? 'Copied' : label}
    </button>
  );
}
