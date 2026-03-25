import Link from "next/link";
import { notFound } from "next/navigation";
import { getDealBorrowerRequests } from "../../../../api/requests";
import { decideBorrowerRequest, generateBorrowerRequestPack } from "../../actions";

function tone(value: string) {
  if (["high", "under_review", "oppose", "declined"].includes(value)) return "critical";
  if (["medium", "open", "support_with_conditions", "approved_with_conditions"].includes(value)) {
    return "warning";
  }
  if (["closed", "support", "approved"].includes(value)) return "good";
  return "neutral";
}

export default async function DealBorrowerRequestsPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  try {
    const data = await getDealBorrowerRequests(slug);
    const canDecideRequests = data.viewer.permissions.canDecideRequests;

    return (
      <main className="shell">
        <section className="hero">
          <div>
            <p className="eyebrow">Borrower requests</p>
            <h1>{data.dealName} consents and waivers</h1>
            <p className="hero-copy">
              Borrower requests capture waiver and consent asks, the requested
              lender action, and account-level voting where the portfolio
              hierarchy needs to approve or oppose.
            </p>
            <p className="meta-note">
              Viewer: {data.viewer.displayName} · {data.viewer.teamName}
            </p>
            <div className="hero-actions">
              <Link className="button primary" href={`/deals/${data.dealSlug}`}>
                Back to deal
              </Link>
              <Link
                className="button secondary"
                href={`/deals/${data.dealSlug}/distribution`}
              >
                Distribution
              </Link>
              <Link
                className="button secondary"
                href={`/deals/${data.dealSlug}/amendments`}
              >
                Amendments
              </Link>
              <Link className="button secondary" href={`/deals/${data.dealSlug}/packs`}>
                Memo Packs
              </Link>
            </div>
          </div>
          <aside className="hero-card">
            <div className="summary-stat-list">
              <div className="summary-stat">
                <span>Open requests</span>
                <strong>{data.summary.openRequests}</strong>
              </div>
              <div className="summary-stat">
                <span>High priority</span>
                <strong>{data.summary.highPriorityRequests}</strong>
              </div>
              <div className="summary-stat">
                <span>With opposition</span>
                <strong>{data.summary.requestsWithOpposition}</strong>
              </div>
              <div className="summary-stat">
                <span>Deal grade</span>
                <strong>{data.dealGrade}</strong>
              </div>
            </div>
          </aside>
        </section>

        <section className="stack">
          {data.requests.map((request) => (
            <article key={request.id} className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">{request.requestType.replaceAll("_", " ")}</p>
                  <h2>{request.title}</h2>
                </div>
                <div className="tag-row">
                  <span className={`badge ${tone(request.priority)}`}>{request.priority}</span>
                  <span className={`badge ${tone(request.requestStatus)}`}>
                    {request.requestStatus.replaceAll("_", " ")}
                  </span>
                </div>
              </div>
              <p>{request.summary}</p>
              <dl className="topsheet-definition-grid">
                <div>
                  <dt>Requested action</dt>
                  <dd>{request.requestedAction}</dd>
                </div>
                <div>
                  <dt>Owner</dt>
                  <dd>{request.ownerName}</dd>
                </div>
                <div>
                  <dt>Borrower contact</dt>
                  <dd>{request.borrowerContact}</dd>
                </div>
                <div>
                  <dt>Submitted</dt>
                  <dd>{request.submittedAt.slice(0, 10)}</dd>
                </div>
                <div>
                  <dt>Due date</dt>
                  <dd>{request.dueDate}</dd>
                </div>
                <div>
                  <dt>SLA</dt>
                  <dd>{request.slaDueAt.slice(0, 10)}</dd>
                </div>
              </dl>
              <div className="mini-card">
                <strong>Decision status</strong>
                <p>{request.decisionSummary}</p>
              </div>
              {request.currentDecision ? (
                <div className="mini-card">
                  <div className="status-row">
                    <strong>Latest decision</strong>
                    <span className={`badge ${tone(request.currentDecision.decisionStatus)}`}>
                      {request.currentDecision.decisionStatus.replaceAll("_", " ")}
                    </span>
                  </div>
                  <p>{request.currentDecision.decisionSummary}</p>
                  <p className="meta-note">
                    {request.currentDecision.decidedBy} ·{" "}
                    {request.currentDecision.decidedAt.slice(0, 10)}
                  </p>
                </div>
              ) : null}
              <div className="stack compact-stack">
                {request.votes.map((vote) => (
                  <div key={vote.id} className="mini-card">
                    <div className="status-row">
                      <strong>{vote.accountName}</strong>
                      <span className={`badge ${tone(vote.voteStatus)}`}>
                        {vote.voteStatus.replaceAll("_", " ")}
                      </span>
                    </div>
                    <p>
                      {vote.voterName} · {vote.decidedAt.slice(0, 10)}
                    </p>
                    <p>{vote.rationale}</p>
                  </div>
                ))}
              </div>
              <div className="decision-row">
                <form action={generateBorrowerRequestPack}>
                  <input type="hidden" name="dealSlug" value={data.dealSlug} />
                  <input type="hidden" name="borrowerRequestId" value={request.id} />
                  <button className="mini-button" type="submit">
                    Generate pack
                  </button>
                </form>
                {canDecideRequests ? (
                  <>
                    <form action={decideBorrowerRequest}>
                      <input type="hidden" name="requestId" value={request.id} />
                      <input type="hidden" name="dealSlug" value={data.dealSlug} />
                      <input type="hidden" name="decisionStatus" value="approved" />
                      <input
                        type="hidden"
                        name="decisionSummary"
                        value="Approved and activated from the borrower request workspace."
                      />
                      <input
                        type="hidden"
                        name="decisionRationale"
                        value="Approval recorded from the deal borrower request workspace."
                      />
                      <button className="mini-button" type="submit">
                        Approve
                      </button>
                    </form>
                    <form action={decideBorrowerRequest}>
                      <input type="hidden" name="requestId" value={request.id} />
                      <input type="hidden" name="dealSlug" value={data.dealSlug} />
                      <input
                        type="hidden"
                        name="decisionStatus"
                        value="approved_with_conditions"
                      />
                      <input
                        type="hidden"
                        name="decisionSummary"
                        value="Approved with conditions and subject to ongoing monitoring."
                      />
                      <input
                        type="hidden"
                        name="decisionRationale"
                        value="Conditional approval recorded from the borrower request workspace."
                      />
                      <button className="mini-button subtle" type="submit">
                        Approve with conditions
                      </button>
                    </form>
                    <form action={decideBorrowerRequest}>
                      <input type="hidden" name="requestId" value={request.id} />
                      <input type="hidden" name="dealSlug" value={data.dealSlug} />
                      <input type="hidden" name="decisionStatus" value="declined" />
                      <input
                        type="hidden"
                        name="decisionSummary"
                        value="Declined from the borrower request workspace."
                      />
                      <input
                        type="hidden"
                        name="decisionRationale"
                        value="Decline recorded from the borrower request workspace."
                      />
                      <button className="mini-button subtle" type="submit">
                        Decline
                      </button>
                    </form>
                  </>
                ) : (
                  <span className="meta-note">This viewer cannot record request decisions.</span>
                )}
              </div>
              {request.decisionHistory.length > 0 ? (
                <div className="stack compact-stack">
                  {request.decisionHistory.map((decision) => (
                    <div key={decision.id} className="mini-card">
                      <div className="status-row">
                        <strong>{decision.decisionStatus.replaceAll("_", " ")}</strong>
                        <span className="badge neutral">{decision.decisionOutcome}</span>
                      </div>
                      <p>{decision.decisionRationale}</p>
                      <p className="meta-note">
                        Effective {decision.effectiveFrom}
                        {decision.expiresOn ? ` · expires ${decision.expiresOn}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </section>
      </main>
    );
  } catch {
    notFound();
  }
}
