"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getAccessToken } from "@privy-io/react-auth";

import type {
  VideoChain,
  VideoInputType,
  VideoPipelineMode,
} from "@/lib/video/create-route-helpers";

type ModeResult = {
  jobId: string;
  status?: string;
  jobUrl?: string;
  requestedPrompt?: string;
  inputType?: string;
  pipeline?: string;
};

type FormInputType = VideoInputType;
type FormPipelineMode = VideoPipelineMode;

const INPUT_TYPE_COPY: Record<
  FormInputType,
  {
    label: string;
    placeholder: string;
    help: string;
  }
> = {
  prompt: {
    label: "Prompt",
    placeholder:
      "A meme launch unfolds like a prestige sci-fi trailer with one impossible final reveal.",
    help: "Use a concise campaign brief, trailer concept, or visual direction.",
  },
  x_profile: {
    label: "X profile",
    placeholder: "@username or https://x.com/username",
    help: "Paste a handle or profile link and we will shape it into a profile-led trailer.",
  },
  contract_address: {
    label: "Contract address",
    placeholder: "Paste a Solana or EVM contract address",
    help: "We resolve token metadata first, then build a launch trailer around it.",
  },
  wallet_address: {
    label: "Solana wallet",
    placeholder: "Paste a Solana wallet address",
    help: "We analyze the last 24 hours of wallet activity to generate a trailer-style recap.",
  },
  image_url: {
    label: "Reference image",
    placeholder: "https://...",
    help: "Use a public image link as the visual anchor for a cinematic trailer.",
  },
};

function normalizeInputType(
  allowedInputTypes: readonly FormInputType[],
  requested: FormInputType | undefined,
): FormInputType {
  if (requested && allowedInputTypes.includes(requested)) {
    return requested;
  }

  return allowedInputTypes[0] ?? "x_profile";
}

function normalizePipeline(
  allowedPipelines: readonly FormPipelineMode[],
  requested: FormPipelineMode | undefined,
): FormPipelineMode {
  if (requested && allowedPipelines.includes(requested)) {
    return requested;
  }

  return allowedPipelines[0] ?? "two_act_cinema";
}

async function parseResult(res: Response): Promise<ModeResult> {
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const message =
      typeof data.error === "string"
        ? data.error
        : typeof data.message === "string"
          ? data.message
          : "Failed to create trailer.";
    throw new Error(message);
  }

  return {
    jobId: typeof data.jobId === "string" ? data.jobId : "",
    status: typeof data.status === "string" ? data.status : undefined,
    jobUrl: typeof data.jobUrl === "string" ? data.jobUrl : undefined,
    requestedPrompt:
      typeof data.requestedPrompt === "string" ? data.requestedPrompt : undefined,
    inputType: typeof data.inputType === "string" ? data.inputType : undefined,
    pipeline: typeof data.pipeline === "string" ? data.pipeline : undefined,
  };
}

function JobCard({ result }: { result: ModeResult | null }) {
  if (!result?.jobId) return null;
  const url = result.jobUrl ?? `/job/${result.jobId}`;

  return (
    <div className="ux-result-card" role="status" aria-live="polite">
      <p>
        <strong>Your trailer is queued.</strong>
      </p>
      {result.requestedPrompt ? (
        <p className="ux-feed-progress">
          {result.requestedPrompt.length > 320
            ? `${result.requestedPrompt.slice(0, 319)}...`
            : result.requestedPrompt}
        </p>
      ) : null}
      <p>
        <Link href={url}>Watch trailer progress</Link>
      </p>
    </div>
  );
}

export function VideoStudioForm(props: {
  endpoint: string;
  allowedInputTypes: readonly FormInputType[];
  allowedPipelines: readonly FormPipelineMode[];
  defaultInputType?: FormInputType;
  defaultPipeline?: FormPipelineMode;
  notesEnabled?: boolean;
  requiresPrivyAuth?: boolean;
  submitLabel: string;
}) {
  useEffect(() => {
    document.body.classList.add("show");
    return () => {
      document.body.classList.remove("show");
    };
  }, []);

  const [inputType, setInputType] = useState<FormInputType>(() =>
    normalizeInputType(props.allowedInputTypes, props.defaultInputType),
  );
  const [pipeline, setPipeline] = useState<FormPipelineMode>(() =>
    normalizePipeline(props.allowedPipelines, props.defaultPipeline),
  );
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [chain, setChain] = useState<VideoChain>("auto");
  const [sceneCount, setSceneCount] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<ModeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const copy = useMemo(() => INPUT_TYPE_COPY[inputType], [inputType]);
  const isPrompt = inputType === "prompt";
  const valueIsEmpty = value.trim().length === 0;
  const notesEnabled = props.notesEnabled ?? true;

  useEffect(() => {
    setInputType((current) => normalizeInputType(props.allowedInputTypes, current));
  }, [props.allowedInputTypes]);

  useEffect(() => {
    setPipeline((current) => normalizePipeline(props.allowedPipelines, current));
  }, [props.allowedPipelines]);

  async function submit() {
    if (isSubmitting || valueIsEmpty) return;

    setIsSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (props.requiresPrivyAuth) {
        const accessToken = await getAccessToken();
        if (!accessToken) {
          throw new Error("Please sign in to access premium studio features.");
        }
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const res = await fetch(props.endpoint, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
          inputType,
          pipeline,
          value: value.trim(),
          notes: notesEnabled ? notes.trim() || undefined : undefined,
          chain,
          sceneCount: pipeline === "hypermyths_generic_engine" ? sceneCount : undefined,
        }),
      });

      setResult(await parseResult(res));
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Request failed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="ux-result-card">
      {props.allowedInputTypes.length > 1 ? (
        <div className="ux-field">
          <label htmlFor="input-type" className="ux-label">
            Source
          </label>
          <select
            id="input-type"
            className="ux-input"
            value={inputType}
            onChange={(event) => setInputType(event.target.value as FormInputType)}
          >
            {props.allowedInputTypes.includes("prompt") ? (
              <option value="prompt">Prompt</option>
            ) : null}
            {props.allowedInputTypes.includes("x_profile") ? (
              <option value="x_profile">X Profile</option>
            ) : null}
            {props.allowedInputTypes.includes("contract_address") ? (
              <option value="contract_address">Token Contract</option>
            ) : null}
            {props.allowedInputTypes.includes("wallet_address") ? (
              <option value="wallet_address">Wallet</option>
            ) : null}
            {props.allowedInputTypes.includes("image_url") ? (
              <option value="image_url">Image</option>
            ) : null}
          </select>
        </div>
      ) : null}

      {props.allowedPipelines.length > 1 ? (
        <div className="ux-field">
          <label htmlFor="pipeline-mode" className="ux-label">
            Film Style
          </label>
          <select
            id="pipeline-mode"
            className="ux-input"
            value={pipeline}
            onChange={(event) =>
              setPipeline(event.target.value as FormPipelineMode)
            }
          >
            {props.allowedPipelines.includes("hypermyths_generic_engine") ? (
              <option value="hypermyths_generic_engine">
                Multi-Act (3–10 acts)
              </option>
            ) : null}
            {props.allowedPipelines.includes("two_act_cinema") ? (
              <option value="two_act_cinema">Trailer Cut</option>
            ) : null}
          </select>
        </div>
      ) : null}

      {pipeline === "hypermyths_generic_engine" ? (
        <div className="ux-field">
          <label htmlFor="scene-count" className="ux-label">
            Story length
          </label>
          <select
            id="scene-count"
            className="ux-input"
            value={sceneCount}
            onChange={(event) => setSceneCount(Number(event.target.value))}
          >
            {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <option key={n} value={n}>
                {n} acts
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {inputType === "contract_address" ? (
        <div className="ux-field">
          <label htmlFor="contract-chain" className="ux-label">
            Chain
          </label>
          <select
            id="contract-chain"
            className="ux-input"
            value={chain}
            onChange={(event) => setChain(event.target.value as VideoChain)}
          >
            <option value="auto">Auto-detect</option>
            <option value="solana">Solana</option>
            <option value="ethereum">Ethereum</option>
            <option value="bsc">BNB Chain</option>
            <option value="base">Base</option>
          </select>
        </div>
      ) : null}

      <div className="ux-field">
        <label htmlFor="primary-value" className="ux-label">
          {copy.label}
        </label>
        {isPrompt ? (
          <textarea
            id="primary-value"
            className="ux-input"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={copy.placeholder}
            rows={6}
          />
        ) : (
          <input
            id="primary-value"
            className="ux-input"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={copy.placeholder}
            autoComplete="off"
          />
        )}
      </div>

      {notesEnabled ? (
        <div className="ux-field">
          <label htmlFor="notes" className="ux-label">
            Optional notes
          </label>
          <textarea
            id="notes"
            className="ux-input"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Tone, style, pacing, ending, or other creative notes."
            rows={4}
          />
        </div>
      ) : null}

      <div className="ux-actions">
        <button
          type="button"
          className="ux-btn ux-btn--primary"
          onClick={() => void submit()}
          disabled={isSubmitting || valueIsEmpty}
        >
          {isSubmitting ? "Creating trailer..." : props.submitLabel}
        </button>
      </div>

      <JobCard result={result} />
      {error ? <div className="ux-error-card">{error}</div> : null}
    </div>
  );
}
