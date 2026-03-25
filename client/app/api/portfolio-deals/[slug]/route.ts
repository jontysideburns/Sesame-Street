import { NextResponse } from "next/server";
import { getDeal, getDealFinancialPeriod } from "../../../../api/deals";
import { getDealAssessment } from "../../../../api/assessment";
import type { PortfolioDealDrawerResponse } from "../../../../lib/portfolio-deal-drawer";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const [deal, assessment, latestPeriod] = await Promise.all([
      getDeal(slug),
      getDealAssessment(slug),
      getDealFinancialPeriod(slug, "latest")
    ]);

    const payload: PortfolioDealDrawerResponse = {
      slug: deal.slug,
      name: deal.name,
      borrower: deal.borrower,
      dealType: deal.dealType,
      region: deal.region,
      phase: deal.phase,
      grade: deal.grade,
      watchlist: deal.watchlist,
      revenueRisk: deal.revenueRisk,
      status: deal.status,
      summary: deal.summary,
      exposure: deal.exposure,
      facilityAmount: deal.facilityAmount,
      latestPeriodLabel: deal.latestPeriodLabel,
      latestReportedAt: deal.latestReportedAt,
      nextTestDate: deal.nextTestDate,
      covenant: {
        name: deal.covenant.name,
        currentValue: deal.covenant.currentValue,
        headroomPct: deal.covenant.headroomPct,
        status: deal.covenant.status
      },
      distributionAssessment: deal.distributionAssessment
        ? {
            status: deal.distributionAssessment.status,
            periodLabel: deal.distributionAssessment.periodLabel,
            blockerCount: deal.distributionAssessment.blockerCount,
            summary: deal.distributionAssessment.summary
          }
        : null,
      assessment: {
        overallScore: assessment.assessment.overallScore,
        escalationLevel: assessment.assessment.escalationLevel,
        watchlistRecommendation: assessment.assessment.watchlistRecommendation,
        summary: assessment.assessment.summary
      },
      latestPeriodSummary: latestPeriod.summary,
      riskSnapshot: {
        openCount: deal.riskSnapshot.openCount,
        highSeverityCount: deal.riskSnapshot.highSeverityCount,
        nextReviewDate: deal.riskSnapshot.nextReviewDate,
        entries: deal.riskSnapshot.entries.slice(0, 3).map((entry) => ({
          id: entry.id,
          title: entry.title,
          severity: entry.severity,
          status: entry.status,
          ownerName: entry.ownerName,
          nextReviewDate: entry.nextReviewDate,
          summary: entry.summary
        }))
      },
      borrowerRequests: deal.borrowerRequests.slice(0, 3).map((request) => ({
        id: request.id,
        title: request.title,
        priority: request.priority,
        requestStatus: request.requestStatus,
        dueDate: request.dueDate,
        summary: request.summary,
        totalVotes: request.voteSummary.total,
        opposeVotes: request.voteSummary.oppose
      })),
      overdueObligations: deal.obligations
        .filter((item) => item.status === "overdue")
        .slice(0, 3)
        .map((item) => ({
          id: item.id,
          title: item.title,
          dueDate: item.dueDate,
          daysOverdue: item.daysOverdue,
          status: item.status
        })),
      activeTrends: assessment.activeTrends.slice(0, 3).map((trend) => ({
        id: trend.id,
        metricLabel: trend.metricLabel,
        severity: trend.severity,
        periodsObserved: trend.periodsObserved,
        summary: trend.summary
      }))
    };

    return NextResponse.json(payload, {
      headers: {
        "cache-control": "no-store"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load deal detail";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
