import {
  CaptionsIcon,
  CirclePlayIcon,
  PaletteIcon,
  UserRoundIcon,
} from "@/components/ui/icons";

export type SettingsTabId = "account" | "appearance" | "playback" | "subtitles";

interface TabItem {
  id: SettingsTabId;
  label: string;
  icon: React.ReactNode;
}

const TABS: TabItem[] = [
  { id: "account", label: "Account", icon: <UserRoundIcon size={16} /> },
  { id: "appearance", label: "Appearance", icon: <PaletteIcon size={16} /> },
  { id: "playback", label: "Playback", icon: <CirclePlayIcon size={16} /> },
  { id: "subtitles", label: "Subtitles", icon: <CaptionsIcon size={16} /> },
];

interface SettingsTabsProps {
  activeTab: SettingsTabId;
  onChange: (tab: SettingsTabId) => void;
}

export function SettingsTabs({ activeTab, onChange }: SettingsTabsProps) {
  return (
    <nav
      aria-label="Settings sections"
      className="flex items-center gap-6 overflow-x-auto no-scrollbar border-b border-white/10 pb-px"
    >
      {TABS.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`group relative flex items-center gap-2 pb-3 pt-1 text-sm font-medium whitespace-nowrap transition-colors duration-150 cursor-pointer ${
              isActive ? "text-white font-semibold" : "text-white/60 hover:text-white"
            }`}
          >
            <span className={isActive ? "text-white" : "text-white/50 group-hover:text-white/80"}>
              {tab.icon}
            </span>
            <span>{tab.label}</span>
            {isActive && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full"
                aria-hidden="true"
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
