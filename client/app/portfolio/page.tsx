import { getPortfolioCalendar } from "../../api/calendar";
import { getPortfolio } from "../../api/portfolio";
import { DashboardMonitor } from "../../components/dashboard-monitor";

export default async function PortfolioPage({
  searchParams
}: {
  searchParams?: Promise<{
    organisation?: string;
    owner?: string;
    account?: string;
    asAt?: string;
    sector?: string;
    region?: string;
    dealType?: string;
    phase?: string;
    grade?: string;
    watchlist?: string;
    revenueRisk?: string;
  }>;
}) {
  const scope = searchParams ? await searchParams : undefined;

  const [portfolio, calendar] = await Promise.all([
    getPortfolio({
      organisation: scope?.organisation,
      owner: scope?.owner,
      account: scope?.account,
      asAt: scope?.asAt,
      sector: scope?.sector,
      region: scope?.region,
      dealType: scope?.dealType,
      phase: scope?.phase,
      grade: scope?.grade,
      watchlist: scope?.watchlist,
      revenueRisk: scope?.revenueRisk
    }),
    getPortfolioCalendar({
      organisation: scope?.organisation,
      owner: scope?.owner,
      account: scope?.account
    })
  ]);

  return (
    <DashboardMonitor
      portfolio={portfolio}
      calendar={calendar}
    />
  );
}
