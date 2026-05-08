import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(_: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({ status: "prepared", executableOnWeb: false, note: "CancerHawk prepares research tasks only; no trading execution." });
}
