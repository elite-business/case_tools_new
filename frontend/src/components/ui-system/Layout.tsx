'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface MenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  href: string;
  children?: MenuItem[];
}

interface LayoutProps {
  children: React.ReactNode;
  menuItems?: MenuItem[];
}

function Layout({ children, menuItems = [] }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
      document.documentElement.setAttribute('data-theme', 'dark');
    }

    // Check for saved sidebar state
    const savedSidebarState = localStorage.getItem('sidebarOpen');
    if (savedSidebarState !== null) {
      setSidebarOpen(JSON.parse(savedSidebarState));
    }
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    document.documentElement.setAttribute('data-theme', newMode ? 'dark' : '');
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  const toggleSidebar = () => {
    const newState = !sidebarOpen;
    setSidebarOpen(newState);
    localStorage.setItem('sidebarOpen', JSON.stringify(newState));
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}>
        <div className="sidebar-header">
          <div className="logo">
            {sidebarOpen ? (
              <h2 className="heading-4">CaseTools</h2>
            ) : (
              <span className="logo-icon">CT</span>
            )}
          </div>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <div key={item.id} className="nav-item-wrapper">
              <Link
                href={item.href}
                className={`nav-item ${pathname === item.href ? 'nav-item-active' : ''}`}
              >
                {item.icon && <span className="nav-icon">{item.icon}</span>}
                {sidebarOpen && <span className="nav-label">{item.label}</span>}
              </Link>
              {item.children && sidebarOpen && (
                <div className="nav-children">
                  {item.children.map((child) => (
                    <Link
                      key={child.id}
                      href={child.href}
                      className={`nav-child ${pathname === child.href ? 'nav-child-active' : ''}`}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="main-wrapper">
        {/* Header */}
        <header className="header">
          <div className="header-left">
            <button onClick={toggleSidebar} className="btn btn-ghost btn-sm">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 5h14a1 1 0 010 2H3a1 1 0 010-2zm0 5h14a1 1 0 010 2H3a1 1 0 010-2zm0 5h14a1 1 0 010 2H3a1 1 0 010-2z" />
              </svg>
            </button>
          </div>

          <div className="header-right">
            <button onClick={toggleDarkMode} className="btn btn-ghost btn-sm">
              {darkMode ? '☀️' : '🌙'}
            </button>
            <div className="user-menu">
              <img src="/api/placeholder/32/32" alt="User" className="user-avatar" />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}

export default Layout;