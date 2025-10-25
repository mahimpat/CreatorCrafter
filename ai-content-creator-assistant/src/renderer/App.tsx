/**
 * Main Application Component
 */

import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useProjectStore } from './stores/projectStore';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import EditorPage from './pages/EditorPage';
import SettingsPage from './pages/SettingsPage';

const App: React.FC = () => {
  const { loadProjects } = useProjectStore();

  useEffect(() => {
    // Load projects on startup
    loadProjects();

    // Set up menu event listeners
    const cleanupFunctions: Array<() => void> = [];

    if (window.electronAPI?.on) {
      cleanupFunctions.push(
        window.electronAPI.on.menuNewProject(() => {
          console.log('Menu: New Project');
        })
      );

      cleanupFunctions.push(
        window.electronAPI.on.progressUpdate((progress: any) => {
          console.log('Progress update:', progress);
        })
      );

      cleanupFunctions.push(
        window.electronAPI.on.errorOccurred((error: any) => {
          console.error('Error occurred:', error);
          // Show error notification
        })
      );
    }

    // Cleanup on unmount
    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [loadProjects]);

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="editor/:projectId" element={<EditorPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
};

export default App;
