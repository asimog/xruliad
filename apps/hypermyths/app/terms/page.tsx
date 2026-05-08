import type { Metadata } from "next";
import { disclosureParagraphs } from "./disclosure-content";

export const metadata: Metadata = {
  title: "Terms",
  description: "HyperMyths disclosure statement and terms.",
};

function isSectionHeading(text: string) {
  return (
    /^(\d+\.|FULL DISCLOSURE STATEMENT|THIS IS NOT INVESTMENT|HYPERMYTHS DISCLOSURE)/.test(
      text,
    ) || text === text.toUpperCase()
  );
}

export default function TermsPage() {
  return (
    <main className="terms-page">
      <div className="terms-shell terms-shell--full">
        <header className="terms-header">
          <p className="terms-eyebrow">Terms</p>
          <h1>HyperMyths Disclosure Statement</h1>
        </header>

        <div className="terms-document">
          {disclosureParagraphs.map((paragraph, index) =>
            isSectionHeading(paragraph) ? (
              <h2 key={`${index}-${paragraph}`} className="terms-heading">
                {paragraph}
              </h2>
            ) : (
              <p key={`${index}-${paragraph}`}>{paragraph}</p>
            ),
          )}
        </div>
      </div>
    </main>
  );
}
