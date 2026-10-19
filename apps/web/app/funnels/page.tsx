import { FunnelsReport } from "../../components/reports/funnels-report";
import type { ReportParams } from "../../lib/dashboard-data";
export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<ReportParams>;
}) {
  return <FunnelsReport params={(await searchParams) ?? {}} />;
}
