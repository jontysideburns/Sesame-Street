import { PortfolioDashboard } from "../../components/portfolio-dashboard";

export default async function PortfolioPage({
  searchParams
}: {
  searchParams?: Promise<{
    organisation?: string;
    owner?: string;
    account?: string;
  }>;
}) {
  const scope = searchParams ? await searchParams : undefined;

  return (
    <PortfolioDashboard
      scope={{
        organisation: scope?.organisation,
        owner: scope?.owner,
        account: scope?.account
      }}
    />
  );
}
