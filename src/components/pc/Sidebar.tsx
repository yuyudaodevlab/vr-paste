'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from '@/lib/constants';
import { useSettingsStore } from '@/store/settingsStore';

export function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const pathname = usePathname();
  const debugMode = useSettingsStore((s) => s.settings.debug_mode);

  const visibleItems = NAV_ITEMS.filter(
    (item) => !('debugOnly' in item) || !item.debugOnly || debugMode
  );

  return (
    <aside
      className="fixed left-0 top-0 h-full z-40 flex flex-col transition-all duration-200 border-r"
      style={{
        width: isExpanded ? 'var(--sidebar-expanded)' : 'var(--sidebar-collapsed)',
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border)',
      }}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Logo / Brand */}
      <div
        className="flex items-center h-14 px-4 border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <div
          className="flex items-center justify-center w-8 h-8 rounded-md text-sm font-bold"
          style={{ background: 'var(--accent-cyan)', color: '#000' }}
        >
          C
        </div>
        {isExpanded && (
          <span
            className="ml-3 text-sm font-semibold whitespace-nowrap animate-fade-in"
            style={{ color: 'var(--text-primary)' }}
          >
            CrossClip
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2">
        {visibleItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.id}
              href={item.path}
              className="flex items-center px-4 py-3 mx-2 rounded-md transition-all duration-150 relative group"
              style={{
                backgroundColor: isActive ? 'var(--bg-elevated)' : 'transparent',
                color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              }}
            >
              {/* Active indicator */}
              {isActive && (
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r"
                  style={{ backgroundColor: 'var(--accent-cyan)' }}
                />
              )}
              <span className="text-lg w-8 text-center flex-shrink-0">{item.icon}</span>
              {isExpanded && (
                <span className="ml-2 text-sm font-medium whitespace-nowrap animate-fade-in">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Version */}
      {isExpanded && (
        <div
          className="px-4 py-3 text-xs animate-fade-in"
          style={{ color: 'var(--text-muted)' }}
        >
          v1.0.0
        </div>
      )}
    </aside>
  );
}
