"use client";


import { PrivyProtected } from "@/components/auth/PrivyProtected";
import { UnifiedRouteShell } from "@/components/shell/UnifiedRouteShell";
import { VideoStudioForm } from "@/components/video/VideoStudioForm";
import {
  isPrivyConfigured,
} from "@/lib/auth/private-studio-config";

function CreatorPageInner() {

  return (
    <UnifiedRouteShell
      eyebrow="PREMIUM STUDIO"
      title="Creator Studio"
      subtitle="Private cinematic trailers for token launches, creator profiles, wallet recaps, prompts, and images."
    >
      <div className="ux-stack">
        <PrivyProtected>
          <VideoStudioForm
            endpoint="/api/video/create"
            allowedInputTypes={["prompt", "image_url", "x_profile", "contract_address", "wallet_address"]}
            allowedPipelines={["two_act_cinema"]}
            defaultInputType="prompt"
            defaultPipeline="two_act_cinema"
            notesEnabled
            requiresPrivyAuth
            submitLabel="Create trailer"
          />
        </PrivyProtected>
      </div>
    </UnifiedRouteShell>
  );
}

export default function CreatorPage() {
  if (!isPrivyConfigured()) {
    return (
      <UnifiedRouteShell
        eyebrow="PREMIUM STUDIO"
        title="Studio Temporarily Unavailable"
        subtitle="Creator Studio sign-in is being tuned. Please check back shortly."
      >
        <div className="ux-error-card">
          We are polishing private access before reopening the studio.
        </div>
      </UnifiedRouteShell>
    );
  }

  return <CreatorPageInner />;
}
