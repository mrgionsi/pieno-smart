import { ProfileManager } from "../components/profile-manager";
import { AppShell } from "../components/shell";

export default function ProfilesScreen() {
  return (
    <AppShell
      title="Profiles Shape Smarter Suggestions"
      subtitle="Save Fuel and Service Preferences Now So the Same Profile Can Drive Nearby and Route-Based Recommendation Later."
    >
      <ProfileManager />
    </AppShell>
  );
}
