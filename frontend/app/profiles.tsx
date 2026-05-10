import { ProfileManager } from "../components/profile-manager";
import { AppShell } from "../components/shell";

export default function ProfilesScreen() {
  return (
    <AppShell
      title="Profiles Shape Smarter Suggestions"
      subtitle="Save Fuel And Service Preferences Now So The Same Profile Can Drive Nearby And Route-Based Recommendation Later."
    >
      <ProfileManager />
    </AppShell>
  );
}
