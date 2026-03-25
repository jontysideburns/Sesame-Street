"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PortfolioResponse } from "../api/portfolio";

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

type Hierarchy = PortfolioResponse["hierarchy"];

export function PortfolioTree({
  platformClientName,
  hierarchy,
  holdings
}: {
  platformClientName: string;
  hierarchy: Hierarchy;
  holdings: PortfolioResponse["holdings"];
}) {
  const router = useRouter();
  const [isPending, transition] = useTransition();
  const activeOrganisation = hierarchy.organisations.find((item) => item.active);
  const activeOwner = hierarchy.owners.find((item) => item.active);
  const activeAccount = hierarchy.accounts.find((item) => item.active);
  const [expandedOrganisationId, setExpandedOrganisationId] = useState<number | null>(
    activeOrganisation?.id ?? null
  );
  const [expandedOwnerId, setExpandedOwnerId] = useState<number | null>(
    activeOwner?.id ?? null
  );
  const [expandedHoldingId, setExpandedHoldingId] = useState<number | null>(null);

  useEffect(() => {
    setExpandedOrganisationId(activeOrganisation?.id ?? null);
    setExpandedOwnerId(activeOwner?.id ?? null);
  }, [activeOrganisation?.id, activeOwner?.id]);

  useEffect(() => {
    setExpandedHoldingId(null);
  }, [activeAccount?.id]);

  function navigate(
    href: string,
    nextOrganisationId: number | null,
    nextOwnerId: number | null
  ) {
    setExpandedOrganisationId(nextOrganisationId);
    setExpandedOwnerId(nextOwnerId);
    transition(() => {
      router.replace(href, { scroll: false });
    });
  }

  function toggleHolding(holdingId: number) {
    setExpandedHoldingId((current) => (current === holdingId ? null : holdingId));
  }

  return (
    <section className="portfolio-tree-section">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Navigator</p>
          <h2>Client hierarchy</h2>
        </div>
        <span className="badge neutral">
          {isPending ? "Updating scope..." : platformClientName}
        </span>
      </div>
      <div className="hierarchy-browser">
        <div className="hierarchy-copy">
          <p>
            Browse the ownership chain like a file browser. The branch expands in
            place first, then the page scope refreshes without jumping the
            viewport.
          </p>
        </div>
        <div className="tree-root">
          {hierarchy.organisations.map((organisation) => {
            const isExpanded = expandedOrganisationId === organisation.id;
            const owners = hierarchy.owners.filter(
              (item) => item.organisationId === organisation.id
            );

            return (
              <div
                key={`org-${organisation.id}`}
                className={`tree-node ${organisation.active ? "active" : ""}`}
              >
                <button
                  type="button"
                  className="tree-row tree-button"
                  aria-expanded={isExpanded}
                  onClick={() =>
                    navigate(organisation.href, organisation.id, null)
                  }
                >
                  <div className="tree-row-main">
                    <span className="tree-chevron" aria-hidden="true">
                      {isExpanded ? "▾" : "▸"}
                    </span>
                    <span className="tree-label">Organisation</span>
                    <strong>{organisation.name}</strong>
                  </div>
                  <div className="tree-metrics">
                    <span className="tree-value">{formatMoney(organisation.exposure)}</span>
                    <span className="tree-metric">{organisation.dealCount} deals</span>
                    <span className="tree-metric">
                      {organisation.watchlistCount} watchlist
                    </span>
                  </div>
                </button>

                <div className={`tree-panel ${isExpanded ? "expanded" : ""}`}>
                  <div className="tree-panel-inner">
                    <div className="tree-branch">
                      <p className="tree-description">
                        {organisation.type.replaceAll("_", " ")}. Holds the scoped
                        exposure for this legal entity and expands to its portfolio
                        owners below.
                      </p>
                      <div className="tree-children">
                        {owners.map((owner) => {
                          const ownerExpanded = expandedOwnerId === owner.id;
                          const accounts = hierarchy.accounts.filter(
                            (item) => item.ownerId === owner.id
                          );

                          return (
                            <div
                              key={`owner-${owner.id}`}
                              className={`tree-node ${owner.active ? "active" : ""}`}
                            >
                              <button
                                type="button"
                                className="tree-row tree-button"
                                aria-expanded={ownerExpanded}
                                onClick={() =>
                                  navigate(owner.href, organisation.id, owner.id)
                                }
                              >
                                <div className="tree-row-main">
                                  <span className="tree-chevron" aria-hidden="true">
                                    {ownerExpanded ? "▾" : "▸"}
                                  </span>
                                  <span className="tree-label">Owner</span>
                                  <strong>{owner.name}</strong>
                                </div>
                                <div className="tree-metrics">
                                  <span className="tree-value">
                                    {formatMoney(owner.exposure)}
                                  </span>
                                  <span className="tree-metric">{owner.dealCount} deals</span>
                                  <span className="tree-metric">
                                    {owner.watchlistCount} watchlist
                                  </span>
                                </div>
                              </button>

                              <div className={`tree-panel ${ownerExpanded ? "expanded" : ""}`}>
                                <div className="tree-panel-inner">
                                  <div className="tree-branch">
                                    <p className="tree-description">
                                      Beneficial owner within {owner.organisationName}. Expand
                                      to see the underlying accounts and mandates.
                                    </p>
                                    <div className="tree-children">
                                      {accounts.map((account) => (
                                        <div
                                          key={`account-${account.id}`}
                                          className={`tree-node ${account.active ? "active" : ""}`}
                                        >
                                          {(() => {
                                            const accountHoldings = holdings.filter(
                                              (holding) => holding.accountId === account.id
                                            );

                                            return (
                                              <>
                                          <button
                                            type="button"
                                            className="tree-row tree-button"
                                            aria-expanded={activeAccount?.id === account.id}
                                            onClick={() =>
                                              navigate(
                                                account.href,
                                                organisation.id,
                                                owner.id
                                              )
                                            }
                                          >
                                            <div className="tree-row-main">
                                              <span className="tree-chevron" aria-hidden="true">
                                                {activeAccount?.id === account.id ? "▾" : "▸"}
                                              </span>
                                              <span className="tree-label">Account</span>
                                              <strong>{account.name}</strong>
                                            </div>
                                            <div className="tree-metrics">
                                              <span className="tree-value">
                                                {formatMoney(account.exposure)}
                                              </span>
                                              <span className="tree-metric">
                                                {account.dealCount} deals
                                              </span>
                                              <span className="tree-metric">
                                                {account.watchlistCount} watchlist
                                              </span>
                                              <span className="tree-metric">
                                                {account.benchmark}
                                              </span>
                                            </div>
                                          </button>
                                          <div
                                            className={`tree-panel ${
                                              activeAccount?.id === account.id
                                                ? "expanded"
                                                : ""
                                            }`}
                                          >
                                            <div className="tree-panel-inner">
                                              <div className="tree-branch">
                                                <p className="tree-description">
                                                  {account.type.replaceAll("_", " ")}. Benchmark:{" "}
                                                  {account.benchmark}.
                                                </p>
                                                <div className="tree-leaf-note">
                                                  This account is the current scope. Expand a
                                                  holding to see the underlying deal.
                                                </div>
                                                <div className="tree-children">
                                                  {accountHoldings.map((holding) => {
                                                    const holdingExpanded =
                                                      expandedHoldingId === holding.id;

                                                    return (
                                                      <div
                                                        key={`holding-${holding.id}`}
                                                        className="tree-node"
                                                      >
                                                        <button
                                                          type="button"
                                                          className="tree-row tree-button"
                                                          aria-expanded={holdingExpanded}
                                                          onClick={() =>
                                                            toggleHolding(holding.id)
                                                          }
                                                        >
                                                          <div className="tree-row-main">
                                                            <span
                                                              className="tree-chevron"
                                                              aria-hidden="true"
                                                            >
                                                              {holdingExpanded ? "▾" : "▸"}
                                                            </span>
                                                            <span className="tree-label">
                                                              Holding
                                                            </span>
                                                            <strong>
                                                              {holding.currentAmount.toLocaleString()}
                                                              {" "}position
                                                            </strong>
                                                          </div>
                                                          <div className="tree-metrics">
                                                            <span className="tree-value">
                                                              {formatMoney(
                                                                holding.currentAmount
                                                              )}
                                                            </span>
                                                            <span className="tree-metric">
                                                              {holding.status}
                                                            </span>
                                                            <span className="tree-metric">
                                                              Acquired{" "}
                                                              {holding.acquisitionDate}
                                                            </span>
                                                          </div>
                                                        </button>
                                                        <div
                                                          className={`tree-panel ${
                                                            holdingExpanded
                                                              ? "expanded"
                                                              : ""
                                                          }`}
                                                        >
                                                          <div className="tree-panel-inner">
                                                            <div className="tree-branch">
                                                              <p className="tree-description">
                                                                This holding is the account's
                                                                participation in the shared deal
                                                                below.
                                                              </p>
                                                              <div className="tree-children">
                                                                <a
                                                                  href={`/deals/${holding.dealSlug}`}
                                                                  className="tree-row tree-link-row"
                                                                >
                                                                  <div className="tree-row-main">
                                                                    <span
                                                                      className="tree-chevron"
                                                                      aria-hidden="true"
                                                                    >
                                                                      •
                                                                    </span>
                                                                    <span className="tree-label">
                                                                      Deal
                                                                    </span>
                                                                    <strong>
                                                                      {holding.dealName}
                                                                    </strong>
                                                                  </div>
                                                                  <div className="tree-metrics">
                                                                    <span className="tree-value">
                                                                      {holding.grade}
                                                                    </span>
                                                                    <span className="tree-metric">
                                                                      {holding.headroomPct === null
                                                                        ? "Headroom pending"
                                                                        : `${holding.headroomPct.toFixed(1)}% headroom`}
                                                                    </span>
                                                                    <span className="tree-metric">
                                                                      {holding.covenantStatus.replaceAll(
                                                                        "_",
                                                                        " "
                                                                      )}
                                                                    </span>
                                                                    <span className="tree-metric">
                                                                      {holding.phase}
                                                                    </span>
                                                                  </div>
                                                                </a>
                                                              </div>
                                                            </div>
                                                          </div>
                                                        </div>
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                              </>
                                            );
                                          })()}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
