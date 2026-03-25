import Link from "next/link";
import { getPortfolioPacks } from "../../../api/packs";
import { MemoPackList } from "../../../components/memo-pack-list";
import { generatePortfolioWatchlistPack } from "../actions";

function buildScopeHref(scope: {
  organisation?: string;
  owner?: string;
  account?: string;
}) {
  const params = new URLSearchParams();

  if (scope.organisation) params.set("organisation", scope.organisation);
  if (scope.owner) params.set("owner", scope.owner);
  if (scope.account) params.set("account", scope.account);

  return params.size > 0 ? `/portfolio?${params.toString()}` : "/portfolio";
}

export default async function PortfolioPacksPage({
  searchParams
}: {
  searchParams?: Promise<{
    organisation?: string;
    owner?: string;
    account?: string;
  }>;
}) {
  const scope = searchParams ? await searchParams : undefined;
  const data = await getPortfolioPacks(scope);

  return (
    <main className="shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Committee packs</p>
          <h1>{data.scope.title}</h1>
          <p className="hero-copy">
            Generate a portfolio watchlist pack from the current scope and package the
            deals requiring escalation, blocked distributions, and open monitoring
            priorities into one committee-ready artifact.
          </p>
          <div className="hero-actions">
            <Link className="button secondary" href={buildScopeHref(scope ?? {})}>
              Back to portfolio
            </Link>
            <form action={generatePortfolioWatchlistPack}>
              <input type="hidden" name="organisation" value={scope?.organisation ?? ""} />
              <input type="hidden" name="owner" value={scope?.owner ?? ""} />
              <input type="hidden" name="account" value={scope?.account ?? ""} />
              <input type="hidden" name="organisationId" value={scope?.organisation ?? ""} />
              <input type="hidden" name="ownerId" value={scope?.owner ?? ""} />
              <input type="hidden" name="accountId" value={scope?.account ?? ""} />
              <button className="button primary" type="submit">
                Generate watchlist pack
              </button>
            </form>
          </div>
        </div>
        <aside className="hero-card">
          <div className="summary-stat-list">
            <div className="summary-stat">
              <span>Scope</span>
              <strong>{data.scope.level.replaceAll("_", " ")}</strong>
            </div>
            <div className="summary-stat">
              <span>Generated packs</span>
              <strong>{data.packs.length}</strong>
            </div>
            <div className="summary-stat">
              <span>Subtitle</span>
              <strong>{data.scope.subtitle}</strong>
            </div>
          </div>
        </aside>
      </section>

      <MemoPackList
        packs={data.packs}
        emptyTitle="No portfolio committee packs generated yet"
        emptyCopy="Generate a scoped watchlist pack from the current portfolio slice to capture escalations, blocked distributions, and immediate committee actions."
      />
    </main>
  );
}
