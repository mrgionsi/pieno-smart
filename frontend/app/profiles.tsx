import { ProfileManager } from "../components/profile-manager";
import { AppShell } from "../components/shell";

export default function ProfilesScreen() {
  return (
    <AppShell
      title="Profiles shape smarter suggestions"
      subtitle="Save fuel and service preferences now so the same profile can drive nearby and route-based recommendation later."
    >
      <ProfileManager />
    </AppShell>
  );
}
