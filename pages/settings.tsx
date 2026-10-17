import { useRouter } from "next/router";
import { useEffect, useState } from "react";

import { PageSeo } from "@/components/seo/PageSeo";
import { SettingsIcon } from "@/components/ui/icons";
import { SettingsTabs, type SettingsTabId } from "@/components/settings/SettingsTabs";
import { AccountSettings } from "@/components/settings/AccountSettings";
import { AppearanceSettings } from "@/components/settings/AppearanceSettings";
import { PlaybackSettings } from "@/components/settings/PlaybackSettings";
import { SubtitlesSettings } from "@/components/settings/SubtitlesSettings";

const VALID_TABS: SettingsTabId[] = ["account", "appearance", "playback", "subtitles"];

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SettingsTabId>("account");

  useEffect(() => {
    const tabQuery = router.query.tab;
    if (typeof tabQuery === "string" && VALID_TABS.includes(tabQuery as SettingsTabId)) {
      setActiveTab(tabQuery as SettingsTabId);
    }
  }, [router.query.tab]);

  const handleTabChange = (tab: SettingsTabId) => {
    setActiveTab(tab);
    router.replace(
      {
        pathname: "/settings",
        query: tab === "account" ? {} : { tab },
      },
      undefined,
      { shallow: true }
    );
  };

  return (
    <>
      <PageSeo title="Settings - Cineby" noindex />

      <div className="mx-auto max-w-3xl min-h-[calc(100vh-88px)] px-4 pb-20 pt-24 md:px-6 md:pt-32">
        {/* Page Title & Icon matching Cinejoy */}
        <div className="mb-6 flex items-center gap-3">
          <SettingsIcon size={28} className="text-white" />
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            Settings
          </h1>
        </div>

        {/* Section Tabs Bar */}
        <div className="mb-8">
          <SettingsTabs activeTab={activeTab} onChange={handleTabChange} />
        </div>

        {/* Active Section Panel */}
        <div className="animate-in fade-in duration-150">
          {activeTab === "account" && <AccountSettings />}
          {activeTab === "appearance" && <AppearanceSettings />}
          {activeTab === "playback" && <PlaybackSettings />}
          {activeTab === "subtitles" && <SubtitlesSettings />}
        </div>
      </div>
    </>
  );
}
