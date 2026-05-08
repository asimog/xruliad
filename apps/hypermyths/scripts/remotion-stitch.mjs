import path from "path";
import { promises as fs } from "fs";
import { createReadStream } from "fs";
import http from "http";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

const REMOTION_STITCH_COMPOSITION_ID = "clip-stitch";

async function startClipServer(inputPaths) {
  const routeToPath = new Map();
  for (let index = 0; index < inputPaths.length; index += 1) {
    routeToPath.set(`/clip-${index + 1}.mp4`, inputPaths[index]);
  }

  const server = http.createServer((req, res) => {
    const reqUrl = req.url ? req.url.split("?")[0] : "";
    const filePath = reqUrl ? routeToPath.get(reqUrl) : null;
    if (!filePath) {
      res.statusCode = 404;
      res.end("Not found");
      return;
    }

    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Cache-Control", "no-store");
    const stream = createReadStream(filePath);
    stream.on("error", () => {
      res.statusCode = 500;
      res.end("Read error");
    });
    stream.pipe(res);
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Could not determine clip server address");
  }

  const baseUrl = `http://127.0.0.1:${address.port}`;
  const clipUrls = inputPaths.map(
    (_, index) => `${baseUrl}/clip-${index + 1}.mp4`,
  );

  return {
    clipUrls,
    close: async () => {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    },
  };
}

async function main() {
  const configPath = process.argv[2];
  if (!configPath) {
    throw new Error("Usage: node scripts/remotion-stitch.mjs <config-path>");
  }

  console.error(`[remotion-stitch] loading config: ${configPath}`);
  const configRaw = await fs.readFile(configPath, "utf8");
  const config = JSON.parse(configRaw);

  const entryPoint = path.join(
    process.cwd(),
    "video-service",
    "src",
    "remotion",
    "index.tsx",
  );

  console.error(`[remotion-stitch] bundling entry: ${entryPoint}`);
  const serveUrl = await bundle(entryPoint);
  console.error(`[remotion-stitch] bundle ready: ${serveUrl}`);

  const clipServer = await startClipServer(config.inputPaths);
  const clips = clipServer.clipUrls.map((clipUrl, index) => ({
    src: clipUrl,
    durationInFrames: Math.max(
      1,
      Math.round(
        (config.expectedSceneDurationsSeconds[index] ??
          config.defaultSceneDurationSeconds) * config.fps,
      ),
    ),
  }));

  const inputProps = {
    clips,
    fps: config.fps,
    width: config.width,
    height: config.height,
    transitionFrames: config.transitionFrames,
  };

  console.error(
    `[remotion-stitch] selecting composition ${REMOTION_STITCH_COMPOSITION_ID}`,
  );
  const composition = await selectComposition({
    serveUrl,
    id: REMOTION_STITCH_COMPOSITION_ID,
    inputProps,
    logLevel: "error",
  });

  console.error(
    `[remotion-stitch] rendering to ${config.outputPath} (${composition.durationInFrames} frames)`,
  );

  try {
    await renderMedia({
      serveUrl,
      composition,
      inputProps,
      codec: "h264",
      overwrite: true,
      outputLocation: config.outputPath,
      logLevel: "error",
      chromiumOptions: {
        gl: "swiftshader",
      },
      licenseKey: null,
    });
    console.error("[remotion-stitch] render complete");
  } finally {
    await clipServer.close().catch(() => {});
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
