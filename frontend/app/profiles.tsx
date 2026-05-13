import { ProfileManager } from "../components/profile-manager";
import { AppShell } from "../components/shell";
import { useI18n } from "../lib/i18n";

export default function ProfilesScreen() {
  const { t } = useI18n();

  return (
    <AppShell
      title={t("profilesTitle")}
      subtitle={t("profilesSubtitle")}
    >
      <ProfileManager />
    </AppShell>
  );
}
