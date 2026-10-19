import { DashboardReport } from "../components/reports/dashboard-report";
import type { ReportParams } from "../lib/dashboard-data";
export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<ReportParams>;
}) {
  return <DashboardReport params={(await searchParams) ?? {}} />;
}
