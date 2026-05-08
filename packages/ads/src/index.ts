export type AdCampaignBrief = {
  id: string;
  thesisId?: string;
  title: string;
  sponsor: string;
  concept: string;
  paymentMetadataVisible: true;
  status: "prepared" | "quoted" | "approved" | "displaying" | "complete";
};

export function prepareAdCampaign(input: Omit<AdCampaignBrief, "id" | "paymentMetadataVisible" | "status">): AdCampaignBrief {
  return { ...input, id: crypto.randomUUID(), paymentMetadataVisible: true, status: "prepared" };
}
