'use client';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const rules = [
  {
    title: 'Batting (Offense)',
    icon: '&#9918;',
    items: [
      'Move the mouse to position the bat in the strike zone',
      'Hold Click or SPACE to charge swing power, release to swing',
      'A/D or ←/→ to shift batter left/right, W/S or ↑/↓ to move forward/back',
      'Press Q / E to rotate the camera angle for a better view',
      'Right Click or B to toggle bunt stance — the bat is held out for a soft contact (mostly ground balls)',
      'Hit type depends on contact point and timing (ground ball, line drive, fly ball, home run)',
    ],
  },
  {
    title: 'Pitching (Defense)',
    icon: '&#127936;',
    items: [
      'Press Q / W / E / R / T / Y or click to select a pitch type',
      'Click a cell in the 3x3 strike zone grid to aim',
      'The speed bar cycles back and forth — press Enter or click to lock speed',
      'Center of bar = fastest, edges = slowest',
    ],
  },
  {
    title: 'Fielding (Defense)',
    icon: '&#129351;',
    items: [
      'Click a fielder or press their hotkey [1-9] to select them',
      'Use arrow keys or right-click to move the selected fielder',
      'Press Shift or left-click (not on a fielder) to dive (2-second cooldown)',
      'Touching the ball = catch',
      'Assign a path to one fielder, then switch to command others',
      'After catching, click another fielder or press their hotkey to throw',
    ],
  },
  {
    title: 'Baserunning (Offense)',
    icon: '&#127939;',
    items: [
      'Press F or ↑ to send all runners forward one base',
      'Press G or ↓ to retreat runners to the previous base',
      'Runners advance automatically on hits (single / double / HR)',
    ],
  },
  {
    title: 'Scoring & Rules',
    icon: '&#128202;',
    items: [
      '3 strikes = strikeout (out), 4 balls = walk',
      '3 outs = half-inning ends, teams switch offense/defense',
      'Catching a fly ball / pop-up = out',
      'Force / tag outs at bases when fielders hold the ball',
      'Game ends after the configured number of innings',
    ],
  },
];

export default function RulesModal({ isOpen, onClose }: RulesModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700/50 rounded-2xl max-w-2xl w-full mx-4 max-h-[85vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-gray-900/95 backdrop-blur-sm flex items-center justify-between p-5 border-b border-gray-800 z-10">
          <h2 className="text-xl font-bold">How to Play</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-800"
          >
            &times;
          </button>
        </div>

        <div className="p-5 space-y-5">
          {rules.map((section) => (
            <div
              key={section.title}
              className="bg-gray-800/40 rounded-xl p-4 border border-gray-800/50"
            >
              <h3 className="text-sm font-bold text-yellow-400 mb-2.5 flex items-center gap-2">
                <span dangerouslySetInnerHTML={{ __html: section.icon }} />
                {section.title}
              </h3>
              <ul className="space-y-1.5">
                {section.items.map((item, i) => (
                  <li key={i} className="text-gray-300 text-[13px] leading-relaxed flex gap-2">
                    <span className="text-yellow-600 mt-1 text-[8px]">&#9679;</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="sticky bottom-0 bg-gray-900/95 backdrop-blur-sm p-4 border-t border-gray-800">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold rounded-lg transition-colors text-sm"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}
