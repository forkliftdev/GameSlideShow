import { TABS, type TabId } from '../../shared/games';

type CarouselTabsProps = {
  active: TabId;
  counts: Record<TabId, number>;
  onChange: (tab: TabId) => void;
};

/** Horizontally scrollable tab row. Active tab is white with an underline. */
export const CarouselTabs = ({ active, counts, onChange }: CarouselTabsProps) => (
  <div className="flex gap-5 overflow-x-auto no-scrollbar -mx-1 px-1">
    {TABS.map((tab) => {
      const isActive = tab.id === active;
      return (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`relative shrink-0 pb-1.5 text-sm whitespace-nowrap transition-colors cursor-pointer ${
            isActive
              ? 'font-semibold text-gray-900 dark:text-white'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          {tab.label}{' '}
          <span className="text-gray-400 dark:text-gray-500 font-normal">
            {counts[tab.id] ?? 0}
          </span>
          {isActive && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-gray-900 dark:bg-white" />
          )}
        </button>
      );
    })}
  </div>
);
