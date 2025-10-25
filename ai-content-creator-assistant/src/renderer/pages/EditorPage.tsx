import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useProjectStore } from '../stores/projectStore';
import VideoPlayer from '../components/VideoPlayer';
import Timeline from '../components/Timeline';
import Sidebar from '../components/Sidebar';

const EditorPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { currentProject, openProject } = useProjectStore();

  useEffect(() => {
    if (projectId && (!currentProject || currentProject.id !== projectId)) {
      openProject(projectId);
    }
  }, [projectId, currentProject, openProject]);

  if (!currentProject) {
    return <div className="loading">Loading project...</div>;
  }

  return (
    <div className="editor-page">
      <div className="editor-workspace">
        <div className="editor-main">
          <VideoPlayer />
          <Timeline />
        </div>
        <Sidebar />
      </div>
    </div>
  );
};

export default EditorPage;
