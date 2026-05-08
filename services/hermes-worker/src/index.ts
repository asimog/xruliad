console.log("Starting Hermes Worker...");
import("./server.js").catch((err) => {
  console.error("Failed to start Hermes Worker:", err);
  process.exit(1);
});
