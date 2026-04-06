import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, '..', 'src', 'components', 'AdminPanel.tsx');

console.log('📝 Adding RosterMobilePlanner button and modal...\n');

let content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

// Find line with "Roster Planner" text
let rosterLineIndex = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('Roster Planner') && !lines[i].includes('Mobile')) {
    rosterLineIndex = i;
    break;
  }
}

if (rosterLineIndex === -1) {
  console.log('❌ Could not find Roster Planner button');
  process.exit(1);
}

console.log(`✅ Found Roster Planner at line ${rosterLineIndex + 1}`);

// Find the closing )} after the button (should be 2 lines after)
let insertAfterLine = rosterLineIndex + 2; // After )}

// Insert the mobile button
const mobileButtonLines = [
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

lines.splice(insertAfterLine + 1, 0, ...mobileButtonLines);

console.log('✅ Added Roster Planner (Mobile) button');

// Now find the end of file to add modal
const lastFewLines = lines.slice(-10).join('\n');
const closingMatch = lastFewLines.match(/(\s+<\/div>\s+\);\s+\};\s*)$/);

if (closingMatch) {
  const modalCode = `      
      {/* Roster Mobile Planner Modal */}
      {showRosterMobilePlanner && createPortal(
        <RosterMobilePlanner
          onClose={() => setShowRosterMobilePlanner(false)}
          institutionCode={null}
        />,
        document.body
      )}
    </div>
  );
};
`;
  
  // Replace the last part
  const beforeClosing = lines.slice(0, -10).join('\n');
  const newContent = beforeClosing + '\n' + modalCode;
  
  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log('✅ Added RosterMobilePlanner modal');
} else {
  console.log('❌ Could not find closing pattern for modal');
  // Still save the button
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
}

console.log('\n✨ Done! Refresh your browser to see the changes.');
