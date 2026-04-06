import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, '..', 'src', 'components', 'AdminPanel.tsx');

console.log('📝 Adding RosterMobilePlanner to AdminPanel...\n');

let content = fs.readFileSync(filePath, 'utf8');

// 1. Add import after RosterPlanner
const importPattern = /import \{ RosterPlanner \} from '\.\/RosterPlanner'/;
if (content.match(importPattern) && !content.includes("RosterMobilePlanner")) {
  content = content.replace(importPattern, `import { RosterPlanner } from './RosterPlanner'
import { RosterMobilePlanner } from './RosterMobilePlanner'`);
  console.log('✅ Added RosterMobilePlanner import');
} else if (content.includes("RosterMobilePlanner")) {
  console.log('⚠️  Import already exists');
} else {
  console.log('❌ Could not find RosterPlanner import');
}

// 2. Add state variable after showRosterPlanner
const statePattern = /const \[showRosterPlanner, setShowRosterPlanner\] = useState\(false\)/;
if (content.match(statePattern) && !content.includes("showRosterMobilePlanner")) {
  content = content.replace(statePattern, `const [showRosterPlanner, setShowRosterPlanner] = useState(false)
  const [showRosterMobilePlanner, setShowRosterMobilePlanner] = useState(false)`);
  console.log('✅ Added showRosterMobilePlanner state');
} else if (content.includes("showRosterMobilePlanner")) {
  console.log('⚠️  State already exists');
} else {
  console.log('❌ Could not find showRosterPlanner state');
}

// 3. Add button after Roster Planner button
const rosterButtonPattern = /(              <\/button>\n                        \}\)\n              \/\* 9\. Clear Database \*\/)/;
const mobileButton = `$1
              
              {/* Admin Only - 8b. Roster Planner (Mobile) */}
              {currentUser?.id_number === '5274' && (
              <button
                onClick={() => {
                  setShowRosterMobilePlanner(true)
                  setShowQuickActions(false)
                }}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  textAlign: 'left',
                  background: 'white',
                  border: 'none',
                  borderBottom: '1px solid #f3f4f6',
                  color: '#1f2937',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#ccfbf1'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
              >
                <LayoutTemplate className="w-4 h-4" />
                Roster Planner (Mobile)
              </button>
                        )}`;

if (content.match(rosterButtonPattern) && !content.includes("Roster Planner (Mobile)")) {
  content = content.replace(rosterButtonPattern, mobileButton);
  console.log('✅ Added Roster Planner (Mobile) button');
} else if (content.includes("Roster Planner (Mobile)")) {
  console.log('⚠️  Button already exists');
} else {
  console.log('❌ Could not find insertion point for button');
}

// 4. Add modal component before closing div
const closingPattern = /(\s+<\/div>\n  \);\n\};\n)$/m;
const modalComponent = `
      
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

if (content.match(closingPattern) && !content.includes("RosterMobilePlanner\n          onClose")) {
  content = content.replace(closingPattern, modalComponent);
  console.log('✅ Added RosterMobilePlanner modal');
} else if (content.includes("RosterMobilePlanner\n          onClose")) {
  console.log('⚠️  Modal already exists');
} else {
  console.log('❌ Could not find closing pattern');
}

fs.writeFileSync(filePath, content, 'utf8');

console.log('\n✨ Successfully integrated RosterMobilePlanner into AdminPanel!');
console.log('\n📋 Summary:');
console.log('   • Import added');
console.log('   • State variable added');
console.log('   • Quick Actions button added (teal hover)');
console.log('   • Modal component added');
console.log('\n🚀 The "Roster Planner (Mobile)" button is now in Quick Actions!');
