import { NearbyExplorer } from "../components/nearby-explorer";
import { AppShell } from "../components/shell";

export default function HomeScreen() {
  return (
    <AppShell
      title="Best Refueling Decision, Not Just The Cheapest Station"
      subtitle=""
      headerVariant="compact"
    >
      <NearbyExplorer />
    </AppShell>
  );
}
