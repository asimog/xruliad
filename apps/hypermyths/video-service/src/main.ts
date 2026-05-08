import { startVideoService } from "./server";

startVideoService().catch((error) => {
  console.error(error);
  process.exit(1);
});
