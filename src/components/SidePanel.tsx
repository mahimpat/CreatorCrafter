import SubtitleEditor from './SubtitleEditor'
import SFXEditor from './SFXEditor'
import OverlayEditor from './OverlayEditor'
import AnimationEditor from './AnimationEditor'
import './SidePanel.css'

interface SidePanelProps {
  selectedTool: 'subtitles' | 'sfx' | 'overlays' | 'animations'
}

export default function SidePanel({ selectedTool }: SidePanelProps) {
  return (
    <div className="side-panel">
      {selectedTool === 'subtitles' && <SubtitleEditor />}
      {selectedTool === 'sfx' && <SFXEditor />}
      {selectedTool === 'overlays' && <OverlayEditor />}
      {selectedTool === 'animations' && <AnimationEditor />}
    </div>
  )
}
