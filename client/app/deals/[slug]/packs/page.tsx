import Link from "next/link";
import { notFound } from "next/navigation";
import { getDealPacks } from "../../../../api/packs";
import { getDealBorrowerRequests } from "../../../../api/requests";
import { MemoPackList } from "../../../../components/memo-pack-list";
import {
  generateBorrowerRequestPack,
  generateDealCommitteePack
} from "../../actions";

function tone(value: string) {
  if (["high", "under_review", "oppose", "declined"].includes(value)) return "critical";
  if (["medium", "open", "support_with_conditions", "approved_with_conditions"].includes(value)) {
    return "warning";
  }
  if (["closed", "support", "approved"].includes(value)) return "good";
  return "neutral";
}

export default async function DealPacksPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  try {
    const [packs, requests] = await Promise.all([
      getDealPacks(slug),
      getDealBorrowerRequests(slug)
    ]);

    return (
      <main className="shell">
        <section className="hero">
          <div>
            <p className="eyebrow">Committee packs</p>
            <h1>{packs.dealName} memo packs</h1>
            <p className="hero-copy">
              Generate reusable committee packs from the current TopSheet, the latest
              approved period, and any active consent or waiver decisions.
            </p>
            <div className="hero-actions">
              <Link className="button secondary" href={`/deals/${packs.dealSlug}`}>
                Back to deal
              </Link>
              <Link className="button secondary" href={`/deals/${packs.dealSlug}/requests`}>
                Borrower requests
              </Link>
              <form action={generateDealCommitteePack}>
                <input type="hidden" name="dealSlug" value={packs.dealSlug} />
                <button className="button primary" type="submit">
                  Generate deal committee pack
                </button>
              </form>
            </div>
          </div>
          <aside className="hero-card">
            <div className="summary-stat-list">
              <div className="summary-stat">
                <span>Generated packs</span>
                <strong>{packs.packs.length}</strong>
              </div>
              <div className="summary-stat">
                <span>Deal grade</span>
                <strong>{packs.dealGrade}</strong>
              </div>
              <div className="summary-stat">
                <span>Open requests</span>
                <strong>{requests.summary.openRequests}</strong>
              </div>
            </div>
          </aside>
        </section>

        <section className="panel section-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Consent / waiver decision pack</p>
              <h2>Generate request packs</h2>
            </div>
          </div>
          <div className="stack">
            {requests.requests.map((request) => (
              <article key={request.id} className="mini-card">
                <div className="status-row">
                  <strong>{request.title}</strong>
                  <div className="tag-row">
                    <span className={`badge ${tone(request.priority)}`}>{request.priority}</span>
                    <span className={`badge ${tone(request.requestStatus)}`}>
                      {request.requestStatus.replaceAll("_", " ")}
                    </span>
                  </div>
                </div>
                <p>{request.summary}</p>
                <p className="meta-note">
                  Requested action: {request.requestedAction} · due {request.dueDate}
                </p>
                <div className="decision-row">
                  <form action={generateBorrowerRequestPack}>
                    <input type="hidden" name="dealSlug" value={packs.dealSlug} />
                    <input type="hidden" name="borrowerRequestId" value={request.id} />
                    <button className="mini-button" type="submit">
                      Generate decision pack
                    </button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        </section>

        <MemoPackList
          packs={packs.packs}
          emptyTitle="No packs generated yet"
          emptyCopy="Generate a deal committee pack or a borrower request decision pack to create a reusable committee artifact."
        />
      </main>
    );
  } catch {
    notFound();
  }
}
