import { Dashboard } from "@/components/Dashboard";
import { getDb, getLatestProfile, listRuns } from "@/lib/store";
import { serviceStatus } from "@/lib/services";
import { workflow } from "@/lib/workflow";
import { deliveries } from "@/lib/delivery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function Home() {
  const db = getDb();
  return <Dashboard initialProfile={getLatestProfile(db)} services={serviceStatus()} initialRuns={listRuns(db).map(run => ({ ...run, workflowState: workflow(db, run.id)?.state, deliveryState: deliveries(db, run.id)[0]?.state }))} />;
}
