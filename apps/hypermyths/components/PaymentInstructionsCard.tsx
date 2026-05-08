"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

import {
  CopyIcon,
  WalletIcon,
} from "@/components/ui/AppIcons";

interface PaymentInstructionsCardProps {
  amountSol: number;
  paymentAddress: string;
  jobId?: string;
  receivedSol?: number;
  remainingSol?: number;
  statusText?: string;
}

function formatSol(value: number): string {
  return value.toFixed(6).replace(/\.?0+$/, "");
}

function fallbackCopy(value: string): boolean {
  if (typeof document === "undefined") return false;

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";

  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);

  return copied;
}

export function PaymentInstructionsCard(props: PaymentInstructionsCardProps) {
  const [copyError, setCopyError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [payerAddress, setPayerAddress] = useState("");
  const [paymentSignature, setPaymentSignature] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const payableSol = props.remainingSol ?? props.amountSol;
  const payableAmount = formatSol(payableSol);
  const qrPayload = useMemo(
    () =>
      `solana:${props.paymentAddress}?amount=${encodeURIComponent(payableAmount)}`,
    [props.paymentAddress, payableAmount],
  );

  const copyPayload = [
    "HyperMyths checkout",
    `Wallet: ${props.paymentAddress}`,
    `Amount (SOL): ${payableAmount}`,
    "Network: Solana",
    "Send the exact amount above.",
  ].join("\n");

  useEffect(() => {
    let cancelled = false;
    setQrDataUrl(null);
    setQrError(null);

    async function buildQrCode() {
      try {
        const QRCode = await import("qrcode");
        const dataUrl = await QRCode.toDataURL(qrPayload, {
          errorCorrectionLevel: "M",
          margin: 1,
          width: 256,
        });
        if (!cancelled) {
          setQrDataUrl(dataUrl);
        }
      } catch (error) {
        if (!cancelled) {
          setQrError(
            error instanceof Error ? error.message : "Failed to generate QR code.",
          );
        }
      }
    }

    void buildQrCode();
    return () => {
      cancelled = true;
    };
  }, [qrPayload]);

  async function copy(label: string, value: string) {
    let copied = false;

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        copied = true;
      }
    } catch {
      copied = false;
    }

    if (!copied) {
      copied = fallbackCopy(value);
    }

    if (copied) {
      setCopySuccess(`${label} copied.`);
      setCopyError(null);
      return;
    }

    setCopySuccess(null);
    setCopyError("Clipboard copy failed. Please copy manually.");
  }

  async function confirmPayment() {
    if (!props.jobId || !payerAddress.trim() || !paymentSignature.trim()) return;
    setConfirming(true);
    setConfirmError(null);
    try {
      const response = await fetch(`/api/pay-sh/jobs/${props.jobId}/confirm-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          rail: "solana_sol",
          payerAddress: payerAddress.trim(),
          signature: paymentSignature.trim(),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.message ?? payload.error ?? "Payment confirmation failed.");
      }
      window.location.href = `/job/${props.jobId}`;
    } catch (error) {
      setConfirmError(error instanceof Error ? error.message : "Payment confirmation failed.");
    } finally {
      setConfirming(false);
    }
  }

  return (
    <section className="cinema-panel payment-instructions-panel grid gap-6 md:grid-cols-[1fr,300px]">
      <div className="space-y-4">
        <div>
          <p className="cinema-kicker text-[0.68rem] font-semibold">Checkout</p>
          <h2 className="font-display mt-2 text-3xl text-[var(--foreground)]">Complete your payment</h2>
        </div>

        <p className="route-summary">
          Send the exact amount to the wallet below. Once payment is confirmed, your video moves into production automatically.
        </p>

        <p className="inline-note">
          Due:{" "}
          <span className="font-semibold text-[var(--accent-soft)]">
            {formatSol(props.amountSol)} SOL
          </span>
          {typeof props.receivedSol === "number" ? (
            <>
              {" | "}Received:{" "}
              <span className="font-semibold text-[var(--accent-soft)]">
                {formatSol(props.receivedSol)} SOL
              </span>
            </>
          ) : null}
          {typeof props.remainingSol === "number" && props.remainingSol > 0 ? (
            <>
              {" | "}Left:{" "}
              <span className="font-semibold text-[#ffd789]">
                {formatSol(props.remainingSol)} SOL
              </span>
            </>
          ) : null}
        </p>

        <article className="surface-card grid gap-3">
          <p className="eyebrow">Wallet</p>
          <p className="route-summary compact break-all">{props.paymentAddress}</p>
          <button
            type="button"
            onClick={() => void copy("Address", props.paymentAddress)}
            className="button button-secondary w-full sm:w-auto"
          >
            <CopyIcon className="button-icon" aria-hidden="true" />
            Copy address
          </button>
        </article>

        <article className="surface-card grid gap-3">
          <p className="eyebrow">Amount</p>
          <p className="font-display text-3xl leading-none text-[var(--foreground)]">{payableAmount}</p>
          <button
            type="button"
            onClick={() => void copy("Amount", payableAmount)}
            className="button button-secondary w-full sm:w-auto"
          >
            <CopyIcon className="button-icon" aria-hidden="true" />
            Copy amount
          </button>
        </article>

        <div className="button-row">
          <button
            type="button"
            onClick={() => void copy("Payment payload", copyPayload)}
            className="button button-secondary"
          >
            <WalletIcon className="button-icon" aria-hidden="true" />
            Copy payment details
          </button>
        </div>

        {props.jobId ? (
          <article className="surface-card grid gap-3">
            <div>
              <p className="eyebrow">Confirm Pay.sh payment</p>
              <p className="route-summary compact">
                Paste the sender wallet and Solana transaction signature after paying.
              </p>
            </div>
            <input
              className="form-input"
              value={payerAddress}
              onChange={(event) => setPayerAddress(event.target.value)}
              placeholder="Sender wallet"
              aria-label="Sender wallet"
            />
            <input
              className="form-input"
              value={paymentSignature}
              onChange={(event) => setPaymentSignature(event.target.value)}
              placeholder="Transaction signature"
              aria-label="Transaction signature"
            />
            <button
              type="button"
              onClick={() => void confirmPayment()}
              className="button button-primary w-full sm:w-auto"
              disabled={confirming || !payerAddress.trim() || !paymentSignature.trim()}
            >
              {confirming ? "Confirming..." : "Confirm payment"}
            </button>
            {confirmError ? <p className="inline-error">{confirmError}</p> : null}
          </article>
        ) : null}

        {props.statusText ? (
          <p className="route-summary compact">
            Payment status: <span className="font-semibold text-[var(--accent-soft)]">{props.statusText}</span>
          </p>
        ) : null}

        {copySuccess ? <p className="inline-note">{copySuccess}</p> : null}
        {copyError ? <p className="inline-error">{copyError}</p> : null}
      </div>

      <article className="surface-card grid gap-3">
        <p className="eyebrow">QR</p>
        {qrDataUrl ? (
          <div className="space-y-3">
            <Image
              src={qrDataUrl}
              alt="Payment QR code"
              width={224}
              height={224}
              unoptimized
              className="mx-auto h-56 w-56 rounded-[1.1rem] border border-white/10 bg-white p-3"
            />
            <p className="route-summary compact">
              Scan with your Solana wallet and confirm both the wallet and amount before sending.
            </p>
          </div>
        ) : qrError ? (
          <p className="route-summary compact text-red-100">QR unavailable: {qrError}</p>
        ) : (
          <p className="route-summary compact">Generating QR code...</p>
        )}
      </article>
    </section>
  );
}
