import { UnifiedRouteShell } from "@/components/shell/UnifiedRouteShell";
import { VideoStudioForm } from "@/components/video/VideoStudioForm";

export default function MediaPage() {
  return (
    <UnifiedRouteShell
      eyebrow="PUBLIC TRAILER"
      title="Public Trailer Studio"
      subtitle="Generate a free trailer from an X profile, token contract, or Solana wallet."
    >
      <div className="ux-stack">
        <VideoStudioForm
          endpoint="/api/video/public-create"
          allowedInputTypes={["x_profile", "contract_address", "wallet_address"]}
          allowedPipelines={["two_act_cinema"]}
          defaultInputType="x_profile"
          defaultPipeline="two_act_cinema"
          notesEnabled={false}
          submitLabel="Generate trailer"
        />
      </div>
    </UnifiedRouteShell>
  );
}
