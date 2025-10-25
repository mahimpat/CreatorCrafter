import React, { useState } from 'react';
import { useProjectStore } from '../stores/projectStore';

type TabType = 'captions' | 'overlays' | 'sfx' | 'ai';

const Sidebar: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('captions');
  const { currentProject } = useProjectStore();

  if (!currentProject) return null;

  return (
    <div className="sidebar">
      <div className="sidebar-tabs">
        <button className={activeTab === 'captions' ? 'active' : ''} onClick={() => setActiveTab('captions')}>
          Captions
        </button>
        <button className={activeTab === 'overlays' ? 'active' : ''} onClick={() => setActiveTab('overlays')}>
          Overlays
        </button>
        <button className={activeTab === 'sfx' ? 'active' : ''} onClick={() => setActiveTab('sfx')}>
          SFX
        </button>
        <button className={activeTab === 'ai' ? 'active' : ''} onClick={() => setActiveTab('ai')}>
          AI Tools
        </button>
      </div>

      <div className="sidebar-content">
        {activeTab === 'captions' && <CaptionsPanel />}
        {activeTab === 'overlays' && <OverlaysPanel />}
        {activeTab === 'sfx' && <SFXPanel />}
        {activeTab === 'ai' && <AIToolsPanel />}
      </div>
    </div>
  );
};

const CaptionsPanel: React.FC = () => {
  return (
    <div className="panel">
      <button className="btn-primary btn-block">Generate Captions</button>
      <button className="btn-secondary btn-block">Add Caption Manually</button>
      <div className="panel-list">
        <p className="empty-state">No captions yet</p>
      </div>
    </div>
  );
};

const OverlaysPanel: React.FC = () => {
  return (
    <div className="panel">
      <button className="btn-primary btn-block">Add Text Overlay</button>
      <div className="panel-list">
        <p className="empty-state">No overlays yet</p>
      </div>
    </div>
  );
};

const SFXPanel: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(2);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    try {
      const sfx = await window.electronAPI.sfx.generate(prompt, duration);
      console.log('Generated SFX:', sfx);
      setPrompt('');
    } catch (error) {
      console.error('Failed to generate SFX:', error);
    }
  };

  return (
    <div className="panel">
      <div className="sfx-generator">
        <h3>Generate Sound Effect</h3>
        <textarea
          placeholder="Describe the sound effect you want (e.g., 'explosion', 'door creaking', 'whoosh transition')"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          rows={3}
        />
        <div className="form-group">
          <label>Duration (seconds)</label>
          <input type="number" value={duration} onChange={e => setDuration(Number(e.target.value))} min={0.5} max={10} step={0.5} />
        </div>
        <button className="btn-primary btn-block" onClick={handleGenerate}>
          Generate SFX
        </button>
      </div>
      <div className="panel-list">
        <p className="empty-state">No sound effects yet</p>
      </div>
    </div>
  );
};

const AIToolsPanel: React.FC = () => {
  return (
    <div className="panel">
      <h3>AI-Powered Tools</h3>
      <button className="btn-primary btn-block">Analyze Video</button>
      <button className="btn-secondary btn-block">Detect Scene Changes</button>
      <button className="btn-secondary btn-block">Suggest SFX Placements</button>
      <button className="btn-secondary btn-block">Generate Captions</button>

      <div className="ai-info">
        <h4>About AI Tools</h4>
        <p>AI tools help automate content creation tasks using machine learning models.</p>
      </div>
    </div>
  );
};

export default Sidebar;
