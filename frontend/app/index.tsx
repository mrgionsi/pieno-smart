import { NearbyExplorer } from "../components/nearby-explorer";
import { AppShell } from "../components/shell";

export default function HomeScreen() {
  return (
    <AppShell
      title="Best refueling decision, not just the cheapest station"
      subtitle=""
      headerVariant="compact"
      scrollEnabled={false}
    >
      <NearbyExplorer />
    </AppShell>
  );
}
