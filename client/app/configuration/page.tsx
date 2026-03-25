import { ConfigurationSequencer } from "../../components/configuration-sequencer";
import { getDeals } from "../../api/deals";
import { getOnboarding } from "../../api/onboarding";
import { getPortfolio } from "../../api/portfolio";

export default async function ConfigurationPage() {
  const [onboarding, portfolio, deals] = await Promise.all([
    getOnboarding(),
    getPortfolio(),
    getDeals()
  ]);

  const dealReferenceBySlug = new Map(
    onboarding.referenceData.deals.map((deal) => [deal.slug, deal.id])
  );
  const sequencerDeals = deals.map((deal) => ({
    ...deal,
    id: dealReferenceBySlug.get(deal.slug) ?? 0
  }));

  return (
    <ConfigurationSequencer
      organisations={portfolio.hierarchy.organisations}
      accounts={portfolio.hierarchy.accounts}
      holdings={portfolio.holdings.map((holding) => ({
        ...holding,
        benchmark: holding.benchmark ?? "",
        headroomPct: holding.headroomPct ?? 0,
        dealId: dealReferenceBySlug.get(holding.dealSlug) ?? null
      }))}
      deals={sequencerDeals}
      workflows={onboarding.workflows}
      workflowSummary={onboarding.summary}
    />
  );
}
