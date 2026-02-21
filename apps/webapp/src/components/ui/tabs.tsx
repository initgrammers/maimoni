import { useState } from 'react';

interface TabProps {
  label: string;
  children: React.ReactNode;
}

interface TabsProps {
  tabs: Array<{
    label: string;
    content: React.ReactNode;
  }>;
  initialTab?: number;
}

export function Tabs({ tabs, initialTab = 0 }: TabsProps) {
  const [activeTab, setActiveTab] = useState(initialTab);

  return (
    <div className="tabs-container">
      <div className="tabs-nav">
        {tabs.map((tab, index) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => setActiveTab(index)}
            className={`tab-nav-item ${
              activeTab === index
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="tab-content">{tabs[activeTab]?.content}</div>
    </div>
  );
}

export function Tab({ children }: TabProps) {
  return <>{children}</>;
}

export default function SimpleTabs({ tabs, initialTab }: TabsProps) {
  return <Tabs tabs={tabs} initialTab={initialTab} />;
}
