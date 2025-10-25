import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '../stores/projectStore';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { projects, createProject, openProject, deleteProject } = useProjectStore();
  const [newProjectName, setNewProjectName] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    try {
      const project = await createProject(newProjectName);
      setNewProjectName('');
      setShowCreateDialog(false);
      navigate(`/editor/${project.id}`);
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const handleOpenProject = async (projectId: string) => {
    await openProject(projectId);
    navigate(`/editor/${projectId}`);
  };

  return (
    <div className="home-page">
      <div className="home-header">
        <h1>AI Content Creator Assistant</h1>
        <p>Create professional video content with AI-powered tools</p>
      </div>

      <div className="home-actions">
        <button className="btn-primary" onClick={() => setShowCreateDialog(true)}>
          New Project
        </button>
        <button className="btn-secondary" onClick={() => navigate('/settings')}>
          Settings
        </button>
      </div>

      <div className="projects-list">
        <h2>Recent Projects</h2>
        {projects.length === 0 ? (
          <p className="empty-state">No projects yet. Create your first project to get started!</p>
        ) : (
          <div className="projects-grid">
            {projects.map(project => (
              <div key={project.id} className="project-card" onClick={() => handleOpenProject(project.id)}>
                <div className="project-card-header">
                  <h3>{project.name}</h3>
                  <button
                    className="btn-icon"
                    onClick={e => {
                      e.stopPropagation();
                      if (confirm('Delete this project?')) {
                        deleteProject(project.id);
                      }
                    }}
                  >
                    🗑️
                  </button>
                </div>
                <p className="project-date">
                  Last modified: {new Date(project.updatedAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateDialog && (
        <div className="modal-overlay" onClick={() => setShowCreateDialog(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Create New Project</h2>
            <input
              type="text"
              placeholder="Project name"
              value={newProjectName}
              onChange={e => setNewProjectName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateProject()}
              autoFocus
            />
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleCreateProject}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
