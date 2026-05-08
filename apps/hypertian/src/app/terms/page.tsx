import { type Metadata } from 'next';
import { getSiteUrl } from '@/lib/env';

export const metadata: Metadata = {
  title: 'Terms',
  description: 'HyperMyths disclosure statement and terms of use for the experimental MMO alternate reality game ecosystem.',
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="mb-8 text-4xl font-bold text-white">Terms</h1>
      <div className="prose prose-invert max-w-none">
        <h2 className="text-2xl font-semibold text-white mt-8 mb-4">
          HyperMyths Disclosure Statement
        </h2>

        <h3 className="text-xl font-semibold text-white mt-6 mb-3">
          HYPERMYTHS DISCLOSURE: GAMIFIED INTERNET CAPITAL MARKET WORLDS FOR HUMANS &amp; AGENTS
        </h3>

        <h4 className="text-lg font-semibold text-white mt-5 mb-2">1. Purpose</h4>
        <p>
          This disclosure is published before the launch of $pMYTH and $bMYTH to explain the intended structure, purpose, risks, limits, mechanics, governance scope and experimental nature of the HyperMyths ecosystem.
        </p>
        <p>
          This disclosure is not investment advice, tax advice, trading advice, financial advice, accounting advice, medical advice, scientific advice, research advice or individualized legal advice to any purchaser, holder, staker, trader, contributor, developer, researcher, tester, creator, player, faction member or community participant.
        </p>
        <p>
          HyperMyths should be understood as an experimental MMO alternate reality game layered across token communities, AI media generation, internet capital markets, synthetic data generation quests, prediction markets, computation markets, autonomous agents, advertising systems, creator attention markets, governance experiments, research simulations and world-building.
        </p>

        <h4 className="text-lg font-semibold text-white mt-5 mb-2">2. Project Overview &amp; Not Advice</h4>
        <p className="italic">
          &ldquo;If we knew what it was we were doing, it would not be called research, would it?&rdquo; &mdash; Albert Einstein
        </p>
        <p className="italic">
          &ldquo;Behind it all is surely an idea so simple, so beautiful, that when we grasp it &mdash; in a decade, a century, or a millennium &mdash; we will all say to each other, how could it have been otherwise? How could we have been so stupid?&rdquo; &mdash; John Archibald Wheeler
        </p>
        <p>
          HyperMyths is an experimental ecosystem for gamified internet capital markets, MMO alternate reality gameplay, AI media generation, token-community gaming, advertising, creator attention markets, prediction markets, computation markets, autonomous agents, open-source software testing, model testing, research coordination, governance experimentation, capital-management experiments, talent-management experiments, cancer synthetic data generation quests, physics synthetic data generation quests and community world creation.
        </p>

        <h4 className="text-lg font-semibold text-white mt-5 mb-2">3. Preliminary Risk Statement</h4>
        <p>
          Participation is highly risky. No person should buy, hold, stake, vote with, transfer, bridge, trade or use $pMYTH or $bMYTH with funds they cannot afford to lose.
        </p>
        <p>
          The tokens may go to zero. The websites may break. The servers may fail. The game may fail. The agents may hallucinate. The markets may be manipulated. The launchpads may change their rules. Smart contracts may fail. Prediction markets may resolve incorrectly. Computation markets may misprice work. Synthetic data generation quests may produce bad data. AI systems may generate inaccurate or misleading content. Advertising may fail. Community attention may disappear.
        </p>

        <h4 className="text-lg font-semibold text-white mt-5 mb-2">4. Single Operator Experiment</h4>
        <p>
          The project is operated by a single pseudonymous human operator and near-autonomous software agents.
        </p>

        <h4 className="text-lg font-semibold text-white mt-5 mb-2">5. MMO Alternate Reality Game</h4>
        <p>
          HyperMyths should be understood as an experimental MMO alternate reality game layered on token communities, AI media, internet markets, research quests, synthetic data generation quests and faction gameplay.
        </p>

        <h4 className="text-lg font-semibold text-white mt-5 mb-2">6. Official Public Surfaces</h4>
        <p>
          The intended public surfaces are https://hypermyths.com, https://polymyths.com, https://hypertian.com, https://cancerhawk.org, https://hyperkaon.com, https://asimog.com and https://tianezha.com.
        </p>

        <h4 className="text-lg font-semibold text-white mt-5 mb-2">7. Main World Layers</h4>
        <p>
          HyperMyths is the AI media and myth engine. Polymyths is the game-world, server and governance layer. HyperTian is the advertising, attention and creator-market layer. CancerHawk is the cancer synthetic data generation quest layer. HyperKaon is the physics synthetic data generation quest layer. Asimog is the autonomous-agent log. Tianezha is the computation-market layer.
        </p>

        <h4 className="text-lg font-semibold text-white mt-5 mb-2">8. Experimental Participation</h4>
        <p>
          Participation is voluntary. Users should participate only because they want to test, play, build, create, research, generate synthetic data or experiment.
        </p>

        <h4 className="text-lg font-semibold text-white mt-5 mb-2">9. Total Loss Risk</h4>
        <p>
          The tokens may become worthless. The software may fail. The game may fail. The research quests may fail. The markets may behave irrationally.
        </p>

        <h4 className="text-lg font-semibold text-white mt-5 mb-2">10. Token Communities as Factions</h4>
        <p>
          Token communities can become playable factions instead of passive chart watchers.
        </p>

        <h4 className="text-lg font-semibold text-white mt-5 mb-2">11. Two Faction Tokens</h4>
        <p>
          $pMYTH is intended for the Solana/Pump faction. $bMYTH is intended for the Base/Clanker faction. They may have different chains, communities, liquidity, mechanics, culture, fees and gameplay roles. No one should assume both tokens will have the same price, market cap, liquidity, rewards, utility or attention.
        </p>

        <h4 className="text-lg font-semibold text-white mt-5 mb-2">12. No Equal Treatment Promise</h4>
        <p>
          No one should assume both tokens will have the same price, market cap, liquidity, rewards, utility or attention.
        </p>

        <h4 className="text-lg font-semibold text-white mt-5 mb-2">13. No Profit Rights</h4>
        <p>
          $pMYTH and $bMYTH are not equity, debt, dividends, revenue rights, yield products, profit shares, treasury claims, patent claims, RWA claims, research ownership claims or agent-profit claims.
        </p>

        <h4 className="text-lg font-semibold text-white mt-5 mb-2">14. User Responsibility</h4>
        <p>
          Users are responsible for verifying official links, mint addresses, contract addresses, vote addresses, wallets, taxes, legal eligibility, medical interpretation, scientific interpretation and risk decisions.
        </p>

        <h4 className="text-lg font-semibold text-white mt-5 mb-2">15. Final Acceptance</h4>
        <p>
          By participating, the user accepts that HyperMyths is an experimental MMO alternate reality game, not a mature company, regulated financial platform, medical platform, scientific institution, investment product or guaranteed system. Participate only if you understand the risks and want to play, test, build, research, generate synthetic data and experiment.
        </p>

        <h3 className="text-xl font-semibold text-white mt-8 mb-3">
          FULL DISCLOSURE STATEMENT
        </h3>

        <p className="font-bold text-red-400 mt-4 mb-4">
          THIS IS NOT INVESTMENT, TRADING, TAX, ACCOUNTING, FINANCIAL, MEDICAL, SCIENTIFIC, RESEARCH OR LEGAL ADVICE
        </p>

        <p className="mt-4">
          This disclosure is published before the launch of $pMYTH and $bMYTH to explain the intended structure, purpose, risks, limits, mechanics, governance scope and experimental nature of the HyperMyths ecosystem. This disclosure is not investment advice, tax advice, trading advice, financial advice, accounting advice, medical advice, scientific advice, research advice or individualized legal advice.
        </p>

        <p className="mt-4">
          HyperMyths may be fun, useful, chaotic, educational, entertaining or productive. It may also fail completely.
        </p>

        <p className="mt-4">
          There is currently no corporation, foundation, partnership, association, DAO legal wrapper, trust, medical organization, research entity, investment fund or other legal entity issuing, managing or guaranteeing $pMYTH, $bMYTH or HyperMyths unless a separate public announcement says otherwise.
        </p>

        <p className="mt-4">
          The project is not presented as a stable product, mature financial system, regulated fund, investment company, broker, exchange, casino, bank, asset manager, talent agency, registered investment adviser, commodity trading adviser, medical provider, scientific institution, clinical trial sponsor or guaranteed income system.
        </p>

        <p className="mt-4">
          Any person who participates does so voluntarily and at their own risk. The tokens may be volatile, illiquid, manipulated, technically defective, economically unsuccessful, legally restricted or worthless.
        </p>

        <div className="mt-8 border-t border-white/10 pt-4">
          <p className="text-sm text-[var(--color-copy-soft)]">
            Last updated: May 2026. HyperMyths ecosystem terms and disclosures.
          </p>
        </div>
      </div>
    </div>
  );
}
