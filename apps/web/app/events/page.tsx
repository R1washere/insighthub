import { EventsReport } from "../../components/reports/events-report";
import type { ReportParams } from "../../lib/dashboard-data";
export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<ReportParams>;
}) {
  return <EventsReport params={(await searchParams) ?? {}} />;
}
