import { getDashboard } from "../../api/dashboard";
import { DashboardMonitor } from "../../components/dashboard-monitor";

export default async function DashboardPage() {
  const dashboard = await getDashboard();

  return <DashboardMonitor dashboard={dashboard} />;
}
