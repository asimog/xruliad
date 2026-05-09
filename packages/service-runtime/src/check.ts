import { startServiceRuntime } from "./index";

if (process.argv.includes("--check")) {
  console.log(JSON.stringify({ ok: true, package: "@hypermyths/service-runtime" }, null, 2));
} else {
  startServiceRuntime({
    service: "service-runtime-check",
    role: "development check",
    publicSurface: "internal"
  });
}
