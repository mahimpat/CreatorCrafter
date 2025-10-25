import React from 'react';
import { useNavigate } from 'react-router-dom';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="settings-page">
      <div className="settings-header">
        <button className="btn-back" onClick={() => navigate('/')}>
          ← Back
        </button>
        <h1>Settings</h1>
      </div>

      <div className="settings-content">
        <section className="settings-section">
          <h2>General</h2>
          <div className="setting-item">
            <label>Theme</label>
            <select>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="system">System</option>
            </select>
          </div>
          <div className="setting-item">
            <label>Language</label>
            <select>
              <option value="en">English</option>
            </select>
          </div>
        </section>

        <section className="settings-section">
          <h2>AI Services</h2>
          <div className="setting-item">
            <label>Speech-to-Text Provider</label>
            <select>
              <option value="whisper">Whisper</option>
              <option value="google">Google Cloud</option>
              <option value="azure">Azure</option>
            </select>
          </div>
          <div className="setting-item">
            <label>AudioCraft Model</label>
            <select>
              <option value="musicgen-small">MusicGen Small</option>
              <option value="musicgen-medium">MusicGen Medium</option>
              <option value="musicgen-large">MusicGen Large</option>
            </select>
          </div>
        </section>

        <section className="settings-section">
          <h2>Video</h2>
          <div className="setting-item">
            <label>Hardware Acceleration</label>
            <input type="checkbox" defaultChecked />
          </div>
          <div className="setting-item">
            <label>Cache Size (MB)</label>
            <input type="number" defaultValue={1024} min={256} max={10240} />
          </div>
        </section>
      </div>
    </div>
  );
};

export default SettingsPage;
