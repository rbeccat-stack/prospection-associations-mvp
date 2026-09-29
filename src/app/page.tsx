import { Dashboard } from "@/components/Dashboard";
import { getDb, getLatestProfile, listRuns } from "@/lib/store";
import { serviceStatus } from "@/lib/services";
import { workflow } from "@/lib/workflow";
import { deliveries } from "@/lib/delivery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function Home() {
  const db = await getDb();
  const [profile, runs] = await Promise.all([getLatestProfile(db), listRuns(db)]);
  const initialRuns = await Promise.all(runs.map(async run => ({ ...run, workflowState: (await workflow(db, run.id))?.state, deliveryState: (await deliveries(db, run.id))[0]?.state })));
  return <Dashboard initialProfile={profile} services={serviceStatus()} initialRuns={initialRuns} />;
}
