import { NearbyExplorer } from "../components/nearby-explorer";
import { AppShell } from "../components/shell";
import { useI18n } from "../lib/i18n";

export default function HomeScreen() {
  const { t } = useI18n();

  return (
    <AppShell
      title={t("homeTitle")}
      subtitle=""
      headerVariant="compact"
    >
      <NearbyExplorer />
    </AppShell>
  );
}
