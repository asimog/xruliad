import { execFile } from "child_process";
import { promisify } from "util";

import { getEnv } from "@/lib/env";
import { getPayShEndpoint, payShEndpointUrl, type PayShEndpointId } from "./catalog";

const execFileAsync = promisify(execFile);

export type PayShCallStatus =
  | "ok"
  | "disabled"
  | "missing_cli"
  | "http_402"
  | "error";

export type PayShJsonResult = {
  status: PayShCallStatus;
  endpointId: PayShEndpointId;
  service: string;
  url: string;
  price: string;
  data: unknown | null;
  error: string | null;
};

function parseJson(text: string): unknown {
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { text };
  }
}

function payArgs(url: string, body: Record<string, unknown>, sandbox: boolean): string[] {
  const args = sandbox ? ["--sandbox", "curl"] : ["curl"];
  return [
    ...args,
    url,
    "-sS",
    "-H",
    "content-type: application/json",
    "-H",
    "accept: application/json",
    "-d",
    JSON.stringify(body),
  ];
}

export async function payShPostJson(
  endpointId: PayShEndpointId,
  body: Record<string, unknown>,
): Promise<PayShJsonResult> {
  const env = getEnv();
  const endpoint = getPayShEndpoint(endpointId);
  const url = payShEndpointUrl(endpoint);

  if (!env.PAY_SH_ENABLED) {
    return {
      status: "disabled",
      endpointId,
      service: endpoint.service,
      url,
      price: endpoint.price,
      data: null,
      error: "PAY_SH_ENABLED is false.",
    };
  }

  try {
    const { stdout, stderr } = await execFileAsync(
      env.PAY_SH_COMMAND,
      payArgs(url, body, env.PAY_SH_SANDBOX),
      {
        timeout: env.PAY_SH_TIMEOUT_MS,
        maxBuffer: 1024 * 1024 * 4,
        windowsHide: true,
      },
    );

    return {
      status: "ok",
      endpointId,
      service: endpoint.service,
      url,
      price: endpoint.price,
      data: parseJson(stdout),
      error: stderr.trim() || null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = /ENOENT|not recognized|cannot find/i.test(message)
      ? "missing_cli"
      : /402|payment required/i.test(message)
        ? "http_402"
        : "error";

    return {
      status,
      endpointId,
      service: endpoint.service,
      url,
      price: endpoint.price,
      data: null,
      error: message,
    };
  }
}
