import { productCapabilities } from "@hypermyths/product-api";
import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(_: NextApiRequest, res: NextApiResponse) {
  res.status(200).json(productCapabilities("cancerhawk"));
}
