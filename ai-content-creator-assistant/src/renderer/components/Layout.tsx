import React from 'react';
import { Outlet } from 'react-router-dom';

const Layout: React.FC = () => {
  return (
    <div className="app-layout">
      <div className="titlebar">
        <div className="titlebar-drag-region">AI Content Creator Assistant</div>
        <div className="titlebar-buttons">
          <button onClick={() => window.electronAPI.window.minimize()}>_</button>
          <button onClick={() => window.electronAPI.window.maximize()}>□</button>
          <button onClick={() => window.electronAPI.window.close()}>×</button>
        </div>
      </div>
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
