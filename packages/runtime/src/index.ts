export type AppRuntimeMode = "web" | "local" | "hybrid";
export type DeploymentTarget = "local" | "vercel" | "railway" | "supabase" | "unknown";
export type ExecutionMode = "web_prepare_only" | "local_paper" | "local_devnet" | "local_live_user_approved";

export type RuntimeConfig = {
  appRuntimeMode: AppRuntimeMode;
  deploymentTarget: DeploymentTarget;
  enableWebFeatures: boolean;
  enableLocalTrading: boolean;
  enableQvacLocalConnect: boolean;
  enableCloudInference: boolean;
  enableHybridQvac: boolean;
  executionMode: ExecutionMode;
  requireUserApproval: boolean;
};

function boolEnv(name: string, fallback: boolean) {
  const value = process.env[name];
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function runtimeMode(value: string | undefined): AppRuntimeMode {
  return value === "local" || value === "hybrid" ? value : "web";
}

function deploymentTarget(value: string | undefined): DeploymentTarget {
  if (value === "local" || value === "vercel" || value === "railway" || value === "supabase") return value;
  return "unknown";
}

function executionMode(value: string | undefined): ExecutionMode {
  if (value === "local_paper" || value === "local_devnet" || value === "local_live_user_approved") return value;
  return "web_prepare_only";
}

export function readRuntimeConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  return {
    appRuntimeMode: runtimeMode(env.APP_RUNTIME_MODE ?? env.NEXT_PUBLIC_DEFAULT_RUNTIME_MODE),
    deploymentTarget: deploymentTarget(env.DEPLOYMENT_TARGET),
    enableWebFeatures: boolEnv("ENABLE_WEB_FEATURES", true),
    enableLocalTrading: boolEnv("ENABLE_LOCAL_TRADING", true),
    enableQvacLocalConnect: boolEnv("ENABLE_QVAC_LOCAL_CONNECT", true),
    enableCloudInference: boolEnv("ENABLE_CLOUD_INFERENCE", true),
    enableHybridQvac: boolEnv("ENABLE_HYBRID_QVAC", true),
    executionMode: executionMode(env.EXECUTION_MODE),
    requireUserApproval: boolEnv("REQUIRE_USER_APPROVAL", true)
  };
}

export function isWebPrepareOnly(config: RuntimeConfig = readRuntimeConfig()) {
  return config.executionMode === "web_prepare_only";
}

export function assertNoWebLiveTrading(config: RuntimeConfig = readRuntimeConfig()) {
  if (config.deploymentTarget === "vercel" || config.deploymentTarget === "railway") {
    if (config.executionMode === "local_live_user_approved") {
      throw new Error("Live user trading is local-only and cannot run from Vercel or Railway.");
    }
  }
}

export function runtimeStatus(config: RuntimeConfig = readRuntimeConfig()) {
  return {
    status: "ok" as const,
    ...config,
    trading: config.executionMode === "web_prepare_only" ? "web_prepare_only" : "local_only",
    qvac: config.enableQvacLocalConnect ? "optional" : "disabled"
  };
}
