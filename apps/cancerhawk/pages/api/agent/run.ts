import { prepareAgentExecution } from "@hypermyths/product-api";
import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  res.status(200).json(prepareAgentExecution({ productId: "cancerhawk", toolId: req.body?.toolId ?? "research.prepare", input: req.body ?? {} }));
}
