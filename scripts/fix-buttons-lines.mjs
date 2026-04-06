import fs from 'fs';

const filePath = 'c:/Users/subit/Downloads/anwh/src/components/AdminPanel.tsx';
let lines = fs.readFileSync(filePath, 'utf8').split('\n');

console.log('🔧 Fixing AdminPanel by rebuilding button section...\n');

// Find the line with "Admin Only - 8. Roster Planner"
let startLine = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('Admin Only - 8. Roster Planner') && !lines[i].includes('Mobile')) {
    startLine = i;
    break;
  }
}

// Find the line with "9. Clear Database"
let endLine = -1;
for (let i = startLine; i < lines.length; i++) {
  if (lines[i].includes('9. Clear Database')) {
    endLine = i;
    break;
  }
}

if (startLine === -1 || endLine === -1) {
  console.log('❌ Could not find marker lines');
  process.exit(1);
}

console.log(`Found section from line ${startLine + 1} to ${endLine + 1}`);

// Replace the entire section
const newSection = [
  '              {/* Admin Only - 8. Roster Planner */}',
  '              {currentUser?.id_number === \'5274\' && (',
  '              <button',
  '                onClick={() => {',
  '                  setShowRosterPlanner(true)',
  '                  setShowQuickActions(false)',
  '                }}',
  '                style={{',
  '                  width: \'100%\',',
  '                  padding: \'10px 14px\',',
  '                  textAlign: \'left\',',
  '                  background: \'white\',',
  '                  border: \'none\',',
  '                  borderBottom: \'1px solid #f3f4f6\',',
  '                  color: \'#1f2937\',',
  '                  cursor: \'pointer\',',
  '                  display: \'flex\',',
  '                  alignItems: \'center\',',
  '                  gap: \'8px\',',
  '                  fontSize: \'14px\'',
  '                }}',
  '                onMouseEnter={(e) => e.currentTarget.style.background = \'#fef3c7\'}',
  '                onMouseLeave={(e) => e.currentTarget.style.background = \'white\'}',
  '              >',
  '                <LayoutTemplate className="w-4 h-4" />',
  '                Roster Planner',
  '              </button>',
  '                        )}',
  '              ',
  '              {/* Admin Only - 8b. Roster Planner (Mobile) */}',
  '              {currentUser?.id_number === \'5274\' && (',
  '              <button',
  '                onClick={() => {',
  '                  setShowRosterMobilePlanner(true)',
  '                  setShowQuickActions(false)',
  '                }}',
  '                style={{',
  '                  width: \'100%\',',
  '                  padding: \'10px 14px\',',
  '                  textAlign: \'left\',',
  '                  background: \'white\',',
  '                  border: \'none\',',
  '                  borderBottom: \'1px solid #f3f4f6\',',
  '                  color: \'#1f2937\',',
  '                  cursor: \'pointer\',',
  '                  display: \'flex\',',
  '                  alignItems: \'center\',',
  '                  gap: \'8px\',',
  '                  fontSize: \'14px\'',
  '                }}',
  '                onMouseEnter={(e) => e.currentTarget.style.background = \'#ccfbf1\'}',
  '                onMouseLeave={(e) => e.currentTarget.style.background = \'white\'}',
  '              >',
  '                <LayoutTemplate className="w-4 h-4" />',
  '                Roster Planner (Mobile)',
  '              </button>',
  '                        )}'
];

// Replace lines from startLine to endLine-1 (keep the Clear Database comment)
lines.splice(startLine, endLine - startLine, ...newSection);

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('✅ Fixed! Both buttons are now properly structured.');
