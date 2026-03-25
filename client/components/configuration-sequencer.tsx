"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  activateOnboardingWorkflow,
  createOnboardingWorkflow,
  type OnboardingWorkflowActionState
} from "../app/setup/actions";

type OrganisationOption = {
  id: number;
  name: string;
  type: string;
  dealCount: number;
  watchlistCount: number;
  exposure: number;
};

type AccountOption = {
  id: number;
  name: string;
  ownerId: number;
  ownerName: string;
  organisationId: number;
  organisationName: string;
  benchmark: string;
  dealCount: number;
  watchlistCount: number;
  exposure: number;
};

type HoldingOption = {
  id: number;
  organisationId: number;
  organisationName: string;
  ownerId: number;
  ownerName: string;
  accountId: number;
  accountName: string;
  benchmark: string;
  currentAmount: number;
  acquisitionDate: string;
  status: string;
  dealId: number | null;
  dealSlug: string;
  dealName: string;
  grade: string;
  watchlist: boolean;
  covenantStatus: string;
  headroomPct: number;
  distributionStatus: string | null;
};

type DealOption = {
  id: number;
  slug: string;
  name: string;
  summary: string;
  grade: string;
  exposure: number;
  watchlist: boolean;
};

type Workflow = {
  id: number;
  workflowType: string;
  workflowStatus: string;
  organisationName: string;
  ownerDisplayName: string;
  accountName: string;
  dealName: string;
  proposedHoldingAmount: number | null;
  ownerName: string;
  targetGoLiveDate: string;
  summary: string;
  tasks: Array<{
    id: number;
    title: string;
    status: string;
    ownerName: string;
    dueDate: string;
    notes: string;
  }>;
  activationHistory: Array<{
    id: number;
    activationStatus: string;
    activatedBy: string;
    summary: string;
    activatedAt: string;
  }>;
};

type ConfigurationSequencerProps = {
  organisations: OrganisationOption[];
  accounts: AccountOption[];
  holdings: HoldingOption[];
  deals: DealOption[];
  workflows: Workflow[];
  workflowSummary: {
    activeWorkflows: number;
    pendingTasks: number;
    newDealPackets: number;
  };
};

function formatMoney(value: number | null) {
  if (value === null) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

function modeButtonClass(active: boolean) {
  return active ? "segmented-button active" : "segmented-button";
}

const initialWorkflowActionState: OnboardingWorkflowActionState = {
  status: "idle",
  message: ""
};

function OpenWorkflowSubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button className="button primary" type="submit" disabled={disabled || pending}>
      {pending ? "Opening workflow..." : "Open setup workflow"}
    </button>
  );
}

export function ConfigurationSequencer({
  organisations,
  accounts,
  holdings,
  deals,
  workflows,
  workflowSummary
}: ConfigurationSequencerProps) {
  const [workflowActionState, openWorkflowAction] = useActionState(
    createOnboardingWorkflow,
    initialWorkflowActionState
  );
  const [organisationMode, setOrganisationMode] = useState<"existing" | "new">("existing");
  const [selectedOrganisationId, setSelectedOrganisationId] = useState("");
  const [newOrganisationName, setNewOrganisationName] = useState("");

  const [accountMode, setAccountMode] = useState<"existing" | "new">("existing");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [newOwnerName, setNewOwnerName] = useState("");
  const [newAccountName, setNewAccountName] = useState("");

  const [holdingMode, setHoldingMode] = useState<"existing" | "new">("new");
  const [selectedHoldingId, setSelectedHoldingId] = useState("");
  const [newHoldingAmount, setNewHoldingAmount] = useState("");

  const [dealMode, setDealMode] = useState<"existing" | "new">("existing");
  const [selectedDealId, setSelectedDealId] = useState("");
  const [newDealName, setNewDealName] = useState("");

  const [workflowStatus, setWorkflowStatus] = useState("in_progress");
  const [workflowOwner, setWorkflowOwner] = useState("Configuration - Setup");
  const [targetGoLiveDate, setTargetGoLiveDate] = useState("");
  const [workflowDescription, setWorkflowDescription] = useState("");

  const selectedOrganisation = organisations.find(
    (organisation) => String(organisation.id) === selectedOrganisationId
  );
  const selectedAccount = accounts.find((account) => String(account.id) === selectedAccountId);
  const selectedHolding = holdings.find((holding) => String(holding.id) === selectedHoldingId);
  const selectedDeal = deals.find((deal) => String(deal.id) === selectedDealId);

  const existingAccountAllowed =
    organisationMode === "existing" && Boolean(selectedOrganisationId);
  const existingHoldingAllowed =
    accountMode === "existing" && Boolean(selectedAccountId);
  const holdingLinkedDealId =
    selectedHolding?.dealId ??
    deals.find((deal) => deal.slug === selectedHolding?.dealSlug)?.id ??
    null;
  const dealLockedToHolding = holdingMode === "existing" && Boolean(selectedHolding);

  useEffect(() => {
    if (!existingAccountAllowed && accountMode === "existing") {
      setAccountMode("new");
      setSelectedAccountId("");
    }
  }, [accountMode, existingAccountAllowed]);

  useEffect(() => {
    if (
      selectedAccount &&
      selectedOrganisation &&
      selectedAccount.organisationId !== selectedOrganisation.id
    ) {
      setSelectedAccountId("");
    }
  }, [selectedAccount, selectedOrganisation]);

  useEffect(() => {
    if (!existingHoldingAllowed && holdingMode === "existing") {
      setHoldingMode("new");
      setSelectedHoldingId("");
    }
  }, [existingHoldingAllowed, holdingMode]);

  useEffect(() => {
    if (
      selectedHolding &&
      selectedAccount &&
      selectedHolding.accountId !== selectedAccount.id
    ) {
      setSelectedHoldingId("");
    }
  }, [selectedHolding, selectedAccount]);

  useEffect(() => {
    if (dealLockedToHolding && holdingLinkedDealId) {
      setDealMode("existing");
      setSelectedDealId(String(holdingLinkedDealId));
    }
  }, [dealLockedToHolding, holdingLinkedDealId]);

  const filteredAccounts = selectedOrganisation
    ? accounts.filter((account) => account.organisationId === selectedOrganisation.id)
    : [];
  const filteredHoldings = selectedAccount
    ? holdings.filter((holding) => holding.accountId === selectedAccount.id)
    : [];

  const organisationComplete =
    (organisationMode === "existing" && Boolean(selectedOrganisation)) ||
    (organisationMode === "new" && newOrganisationName.trim().length > 0);
  const accountComplete =
    organisationComplete &&
    ((accountMode === "existing" && Boolean(selectedAccount)) ||
      (accountMode === "new" &&
        newOwnerName.trim().length > 0 &&
        newAccountName.trim().length > 0));
  const holdingComplete =
    accountComplete &&
    ((holdingMode === "existing" && Boolean(selectedHolding)) ||
      (holdingMode === "new" && newHoldingAmount.trim().length > 0));
  const dealComplete =
    holdingComplete &&
    (dealLockedToHolding
      ? Boolean(holdingLinkedDealId)
      : (dealMode === "existing" && Boolean(selectedDeal)) ||
        (dealMode === "new" && newDealName.trim().length > 0));

  const resolvedOrganisationId =
    selectedHolding?.organisationId ??
    selectedAccount?.organisationId ??
    selectedOrganisation?.id ??
    null;
  const resolvedOwnerId =
    selectedHolding?.ownerId ??
    selectedAccount?.ownerId ??
    null;
  const resolvedAccountId = selectedHolding?.accountId ?? selectedAccount?.id ?? null;
  const resolvedHoldingId = selectedHolding?.id ?? null;
  const resolvedDealId =
    holdingLinkedDealId ??
    selectedDeal?.id ??
    null;

  const workflowReady =
    dealComplete &&
    workflowOwner.trim().length > 0 &&
    workflowDescription.trim().length > 0 &&
    targetGoLiveDate.length > 0;
  const isHoldingAllocation =
    organisationMode === "existing" &&
    accountMode === "existing" &&
    dealMode === "existing" &&
    !newOrganisationName &&
    !newOwnerName &&
    !newAccountName &&
    !newDealName;

  const activationCandidates = workflows.filter(
    (workflow) => workflow.workflowStatus !== "completed"
  );
  const workflowIssues: string[] = [];

  if (!organisationComplete) {
    workflowIssues.push(
      organisationMode === "existing"
        ? "Step 1: select an organisation or switch to Create new."
        : "Step 1: enter the new organisation name."
    );
  }

  if (!accountComplete) {
    workflowIssues.push(
      accountMode === "existing"
        ? "Step 2: select an account under the chosen organisation."
        : "Step 2: enter both the owner name and the account name."
    );
  }

  if (!holdingComplete) {
    workflowIssues.push(
      holdingMode === "existing"
        ? "Step 3: select a holding under the chosen account."
        : "Step 3: enter the holding amount."
    );
  }

  if (!dealComplete) {
    workflowIssues.push(
      dealMode === "existing" || dealLockedToHolding
        ? "Step 4: select the deal for this setup."
        : "Step 4: enter the new deal name."
    );
  }

  if (workflowOwner.trim().length === 0) {
    workflowIssues.push("Step 5: enter the workflow owner.");
  }

  if (targetGoLiveDate.length === 0) {
    workflowIssues.push("Step 5: choose the target go-live date.");
  }

  if (workflowDescription.trim().length === 0) {
    workflowIssues.push("Step 5: add the workflow summary.");
  }

  return (
    <main className="shell">
      <section className="hero compact">
        <div>
          <p className="eyebrow">Configuration</p>
          <h1>Build setup flows in a strict sequence.</h1>
          <p className="hero-copy">
            Follow the required order: organisation, account, holding, then deal.
            Each step either selects an existing item and shows only its summary,
            or collects the fields needed for a new item.
          </p>
        </div>
      </section>

      <section className="panel section-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">1 to 4. Setup flow</p>
            <h2>Create or select the required setup elements</h2>
          </div>
        </div>

        <form className="configuration-sequence" action={openWorkflowAction}>
          <input
            type="hidden"
            name="workflowType"
            value={isHoldingAllocation ? "holding_allocation" : "new_deal_packet"}
          />
          <input type="hidden" name="workflowStatus" value={workflowStatus} />
          <input type="hidden" name="ownerName" value={workflowOwner} />
          <input type="hidden" name="targetGoLiveDate" value={targetGoLiveDate} />
          <input type="hidden" name="summary" value={workflowDescription} />
          {resolvedOrganisationId ? (
            <input type="hidden" name="organisationId" value={resolvedOrganisationId} />
          ) : null}
          {resolvedOwnerId ? <input type="hidden" name="ownerId" value={resolvedOwnerId} /> : null}
          {resolvedAccountId ? (
            <input type="hidden" name="accountId" value={resolvedAccountId} />
          ) : null}
          {resolvedHoldingId ? (
            <input type="hidden" name="holdingId" value={resolvedHoldingId} />
          ) : null}
          {resolvedDealId ? <input type="hidden" name="dealId" value={resolvedDealId} /> : null}
          {organisationMode === "new" ? (
            <input type="hidden" name="proposedOrganisationName" value={newOrganisationName} />
          ) : null}
          {accountMode === "new" ? (
            <>
              <input type="hidden" name="proposedOwnerName" value={newOwnerName} />
              <input type="hidden" name="proposedAccountName" value={newAccountName} />
            </>
          ) : null}
          {holdingMode === "new" ? (
            <input type="hidden" name="proposedHoldingAmount" value={newHoldingAmount} />
          ) : null}
          {!dealLockedToHolding && dealMode === "new" ? (
            <input type="hidden" name="proposedDealName" value={newDealName} />
          ) : null}

          <article className="config-step-card">
            <div className="config-step-header">
              <div>
                <p className="eyebrow">Step 1</p>
                <h3>Organisation</h3>
              </div>
              <div className="segmented-control">
                <button
                  className={modeButtonClass(organisationMode === "existing")}
                  type="button"
                  onClick={() => setOrganisationMode("existing")}
                >
                  Select existing
                </button>
                <button
                  className={modeButtonClass(organisationMode === "new")}
                  type="button"
                  onClick={() => setOrganisationMode("new")}
                >
                  Create new
                </button>
              </div>
            </div>

            {organisationMode === "existing" ? (
              <>
                <label className="field">
                  <span>Organisation</span>
                  <select
                    value={selectedOrganisationId}
                    onChange={(event) => setSelectedOrganisationId(event.target.value)}
                  >
                    <option value="">Select organisation</option>
                    {organisations.map((organisation) => (
                      <option key={organisation.id} value={organisation.id}>
                        {organisation.name}
                      </option>
                    ))}
                  </select>
                </label>
                {selectedOrganisation ? (
                  <div className="mini-card">
                    <div className="status-row">
                      <strong>{selectedOrganisation.name}</strong>
                      <span className="badge neutral">{selectedOrganisation.type}</span>
                    </div>
                    <p>
                      Exposure {formatMoney(selectedOrganisation.exposure)} ·{" "}
                      {selectedOrganisation.dealCount} deals ·{" "}
                      {selectedOrganisation.watchlistCount} watchlist
                    </p>
                  </div>
                ) : null}
              </>
            ) : (
              <label className="field">
                <span>Organisation name</span>
                <input
                  value={newOrganisationName}
                  onChange={(event) => setNewOrganisationName(event.target.value)}
                  placeholder="Harborview Retirement System"
                />
              </label>
            )}
          </article>

          <fieldset className="config-step-card" disabled={!organisationComplete}>
            <div className="config-step-header">
              <div>
                <p className="eyebrow">Step 2</p>
                <h3>Account</h3>
                <p className="detail-copy">
                  Account creation also captures the owner name needed by the current hierarchy model.
                </p>
              </div>
              <div className="segmented-control">
                <button
                  className={modeButtonClass(accountMode === "existing")}
                  type="button"
                  disabled={!existingAccountAllowed}
                  onClick={() => setAccountMode("existing")}
                >
                  Select existing
                </button>
                <button
                  className={modeButtonClass(accountMode === "new")}
                  type="button"
                  onClick={() => setAccountMode("new")}
                >
                  Create new
                </button>
              </div>
            </div>

            {accountMode === "existing" ? (
              <>
                <label className="field">
                  <span>Account</span>
                  <select
                    value={selectedAccountId}
                    onChange={(event) => setSelectedAccountId(event.target.value)}
                  >
                    <option value="">Select account</option>
                    {filteredAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} · {account.ownerName}
                      </option>
                    ))}
                  </select>
                </label>
                {selectedAccount ? (
                  <div className="mini-card">
                    <div className="status-row">
                      <strong>{selectedAccount.name}</strong>
                      <span className="badge neutral">{selectedAccount.benchmark}</span>
                    </div>
                    <p>
                      {selectedAccount.ownerName} · {selectedAccount.organisationName}
                    </p>
                    <p className="meta-note">
                      Exposure {formatMoney(selectedAccount.exposure)} ·{" "}
                      {selectedAccount.dealCount} deals · {selectedAccount.watchlistCount} watchlist
                    </p>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="form-grid">
                <label className="field">
                  <span>Owner name</span>
                  <input
                    value={newOwnerName}
                    onChange={(event) => setNewOwnerName(event.target.value)}
                    placeholder="Harborview Infrastructure Committee"
                  />
                </label>
                <label className="field">
                  <span>Account name</span>
                  <input
                    value={newAccountName}
                    onChange={(event) => setNewAccountName(event.target.value)}
                    placeholder="Harborview Core Infrastructure Sleeve"
                  />
                </label>
              </div>
            )}
          </fieldset>

          <fieldset className="config-step-card" disabled={!accountComplete}>
            <div className="config-step-header">
              <div>
                <p className="eyebrow">Step 3</p>
                <h3>Holding</h3>
              </div>
              <div className="segmented-control">
                <button
                  className={modeButtonClass(holdingMode === "existing")}
                  type="button"
                  disabled={!existingHoldingAllowed}
                  onClick={() => setHoldingMode("existing")}
                >
                  Select existing
                </button>
                <button
                  className={modeButtonClass(holdingMode === "new")}
                  type="button"
                  onClick={() => setHoldingMode("new")}
                >
                  Create new
                </button>
              </div>
            </div>

            {holdingMode === "existing" ? (
              <>
                <label className="field">
                  <span>Holding</span>
                  <select
                    value={selectedHoldingId}
                    onChange={(event) => setSelectedHoldingId(event.target.value)}
                  >
                    <option value="">Select holding</option>
                    {filteredHoldings.map((holding) => (
                      <option key={holding.id} value={holding.id}>
                        {holding.dealName} · {formatMoney(holding.currentAmount)}
                      </option>
                    ))}
                  </select>
                </label>
                {selectedHolding ? (
                  <div className="mini-card">
                    <div className="status-row">
                      <strong>{selectedHolding.dealName}</strong>
                      <span className="badge neutral">{selectedHolding.grade}</span>
                    </div>
                    <p>
                      {selectedHolding.accountName} · {selectedHolding.ownerName}
                    </p>
                    <p className="meta-note">
                      {formatMoney(selectedHolding.currentAmount)} · acquired{" "}
                      {selectedHolding.acquisitionDate} · {selectedHolding.status.replaceAll("_", " ")}
                    </p>
                  </div>
                ) : null}
              </>
            ) : (
              <label className="field">
                <span>Holding amount</span>
                <input
                  type="number"
                  min="0"
                  step="1000000"
                  value={newHoldingAmount}
                  onChange={(event) => setNewHoldingAmount(event.target.value)}
                  placeholder="25000000"
                />
              </label>
            )}
          </fieldset>

          <fieldset className="config-step-card" disabled={!holdingComplete}>
            <div className="config-step-header">
              <div>
                <p className="eyebrow">Step 4</p>
                <h3>Deal</h3>
              </div>
              {!dealLockedToHolding ? (
                <div className="segmented-control">
                  <button
                    className={modeButtonClass(dealMode === "existing")}
                    type="button"
                    onClick={() => setDealMode("existing")}
                  >
                    Select existing
                  </button>
                  <button
                    className={modeButtonClass(dealMode === "new")}
                    type="button"
                    onClick={() => setDealMode("new")}
                  >
                    Create new
                  </button>
                </div>
              ) : null}
            </div>

            {dealLockedToHolding ? (
              <>
                <p className="meta-note">
                  This deal is fixed by the selected holding and cannot be changed here.
                </p>
                {deals
                  .filter((deal) => deal.id === holdingLinkedDealId)
                  .map((deal) => (
                    <div key={deal.id} className="mini-card">
                      <div className="status-row">
                        <strong>{deal.name}</strong>
                        <span className={`badge ${deal.watchlist ? "warning" : "neutral"}`}>
                          {deal.grade}
                        </span>
                      </div>
                      <p>{deal.summary}</p>
                      <p className="meta-note">Exposure {formatMoney(deal.exposure)}</p>
                    </div>
                  ))}
              </>
            ) : dealMode === "existing" ? (
              <>
                <label className="field">
                  <span>Deal</span>
                  <select
                    value={selectedDealId}
                    onChange={(event) => setSelectedDealId(event.target.value)}
                  >
                    <option value="">Select deal</option>
                    {deals.map((deal) => (
                      <option key={deal.id} value={deal.id}>
                        {deal.name}
                      </option>
                    ))}
                  </select>
                </label>
                {selectedDeal ? (
                  <div className="mini-card">
                    <div className="status-row">
                      <strong>{selectedDeal.name}</strong>
                      <span className={`badge ${selectedDeal.watchlist ? "warning" : "neutral"}`}>
                        {selectedDeal.grade}
                      </span>
                    </div>
                    <p>{selectedDeal.summary}</p>
                    <p className="meta-note">
                      Exposure {formatMoney(selectedDeal.exposure)} ·{" "}
                      {selectedDeal.watchlist ? "Watchlist" : "Standard monitoring"}
                    </p>
                  </div>
                ) : null}
              </>
            ) : (
              <label className="field">
                <span>Deal name</span>
                <input
                  value={newDealName}
                  onChange={(event) => setNewDealName(event.target.value)}
                  placeholder="Apollo Edge Campus"
                />
              </label>
            )}
          </fieldset>

          <fieldset className="config-step-card" disabled={!dealComplete}>
            <div className="config-step-header">
              <div>
                <p className="eyebrow">Step 5</p>
                <h3>Open setup workflow</h3>
                <p className="detail-copy">
                  This creates the setup packet that will appear below in the
                  activation and approval queue.
                </p>
              </div>
            </div>

            <div className="form-grid">
              <label className="field">
                <span>Workflow status</span>
                <select
                  value={workflowStatus}
                  onChange={(event) => setWorkflowStatus(event.target.value)}
                >
                  <option value="in_progress">In progress</option>
                  <option value="pending_committee">Pending committee</option>
                  <option value="pending_documents">Pending documents</option>
                </select>
              </label>
              <label className="field">
                <span>Workflow owner</span>
                <input
                  value={workflowOwner}
                  onChange={(event) => setWorkflowOwner(event.target.value)}
                />
              </label>
              <label className="field">
                <span>Target go-live date</span>
                <input
                  type="date"
                  value={targetGoLiveDate}
                  onChange={(event) => setTargetGoLiveDate(event.target.value)}
                />
              </label>
            </div>

            <label className="field">
              <span>Workflow summary</span>
              <textarea
                rows={4}
                value={workflowDescription}
                onChange={(event) => setWorkflowDescription(event.target.value)}
                placeholder="Describe the setup intent, approvals needed, and what should happen at activation."
              />
            </label>

            {workflowIssues.length > 0 ? (
              <div className="mini-card">
                <div className="status-row">
                  <strong>Complete the remaining inputs before opening the workflow.</strong>
                  <span className="badge warning">Missing data</span>
                </div>
                <ul className="config-issue-list">
                  {workflowIssues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {workflowActionState.status === "success" ? (
              <div className="mini-card">
                <div className="status-row">
                  <strong>Workflow opened</strong>
                  <span className="badge good">Saved</span>
                </div>
                <p>{workflowActionState.message}</p>
              </div>
            ) : null}

            {workflowActionState.status === "error" ? (
              <div className="mini-card">
                <div className="status-row">
                  <strong>Unable to open workflow</strong>
                  <span className="badge critical">Error</span>
                </div>
                <p>{workflowActionState.message}</p>
              </div>
            ) : null}

            <div className="form-actions">
              <OpenWorkflowSubmitButton disabled={!workflowReady} />
            </div>
          </fieldset>
        </form>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">5. Activation / approval layer</p>
            <h2>Open workflows and activation controls</h2>
            <p className="detail-copy">
              Pending tasks are also visible in <Link className="text-link" href="/work">Work</Link>.
              Workflows stay here because activation happens here.
            </p>
          </div>
        </div>
        <div className="review-summary-bar">
          <div>
            <span>Active workflows</span>
            <strong>{workflowSummary.activeWorkflows}</strong>
          </div>
          <div>
            <span>Pending tasks</span>
            <strong>{workflowSummary.pendingTasks}</strong>
          </div>
          <div>
            <span>New deal packets</span>
            <strong>{workflowSummary.newDealPackets}</strong>
          </div>
          <div>
            <span>Activation candidates</span>
            <strong>{activationCandidates.length}</strong>
          </div>
        </div>
        <div className="review-workspace-list">
          {workflows.map((workflow) => (
            <details key={workflow.id} className="review-workspace-item">
              <summary className="review-workspace-summary">
                <div className="review-workspace-mainline">
                  <strong>{workflow.dealName || "Unnamed packet"}</strong>
                  <span>{workflow.organisationName || "Net new organisation"}</span>
                  <span>{workflow.accountName || "Net new account"}</span>
                  <span>{workflow.workflowType.replaceAll("_", " ")}</span>
                </div>
                <div className="review-workspace-summary-meta">
                  <span className="badge neutral compact-pill">
                    {workflow.workflowStatus.replaceAll("_", " ")}
                  </span>
                  <span className="badge neutral compact-pill">
                    {workflow.tasks.length} tasks
                  </span>
                  <small>Go-live {workflow.targetGoLiveDate}</small>
                </div>
              </summary>

              <div className="review-workspace-details">
                <p className="detail-copy">{workflow.summary}</p>
                <dl className="topsheet-definition-grid">
                  <div>
                    <dt>Type</dt>
                    <dd>{workflow.workflowType.replaceAll("_", " ")}</dd>
                  </div>
                  <div>
                    <dt>Organisation</dt>
                    <dd>{workflow.organisationName || "Net new"}</dd>
                  </div>
                  <div>
                    <dt>Owner / account</dt>
                    <dd>
                      {workflow.ownerDisplayName || "Net new"} /{" "}
                      {workflow.accountName || "Net new"}
                    </dd>
                  </div>
                  <div>
                    <dt>Holding</dt>
                    <dd>{formatMoney(workflow.proposedHoldingAmount)}</dd>
                  </div>
                  <div>
                    <dt>Workflow owner</dt>
                    <dd>{workflow.ownerName}</dd>
                  </div>
                  <div>
                    <dt>Go-live target</dt>
                    <dd>{workflow.targetGoLiveDate}</dd>
                  </div>
                </dl>

                <div className="stack compact-stack">
                  {workflow.tasks.map((task) => (
                    <div key={task.id} className="mini-card">
                      <div className="status-row">
                        <strong>{task.title}</strong>
                        <span className="badge neutral">
                          {task.status.replaceAll("_", " ")}
                        </span>
                      </div>
                      <p>
                        {task.ownerName} · due {task.dueDate}
                      </p>
                      <p>{task.notes}</p>
                    </div>
                  ))}
                </div>

                {workflow.activationHistory.length > 0 ? (
                  <div className="stack compact-stack">
                    {workflow.activationHistory.map((event) => (
                      <div key={event.id} className="mini-card">
                        <div className="status-row">
                          <strong>Activation event</strong>
                          <span className="badge good">
                            {event.activationStatus.replaceAll("_", " ")}
                          </span>
                        </div>
                        <p>{event.summary}</p>
                        <p className="meta-note">
                          {event.activatedBy} · {event.activatedAt.slice(0, 10)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}

                {workflow.workflowStatus !== "completed" ? (
                  <form action={activateOnboardingWorkflow} className="form-actions">
                    <input type="hidden" name="workflowId" value={workflow.id} />
                    <button className="button secondary" type="submit">
                      Activate workflow
                    </button>
                  </form>
                ) : null}
              </div>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
