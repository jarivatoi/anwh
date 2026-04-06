import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, '..', 'src', 'components', 'RosterPanel.tsx');

console.log('📝 Adding RosterMobilePlanner integration to RosterPanel.tsx...\n');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add state variable after showStaffManagement
const statePattern = /const \[showStaffManagement, setShowStaffManagement\] = useState\(false\);/;
const stateReplacement = `const [showStaffManagement, setShowStaffManagement] = useState(false);
  const [showRosterMobilePlanner, setShowRosterMobilePlanner] = useState(false);`;

if (content.match(statePattern)) {
  content = content.replace(statePattern, stateReplacement);
  console.log('✅ Added showRosterMobilePlanner state variable');
} else {
  console.log('⚠️  Could not find showStaffManagement state - may already be added');
}

// 2. Add button after Staff Management button
const staffButtonPattern = /(<button\s+onClick=\{\(\) => \{\s+setShowQuickActions\(false\);\s+setShowStaffManagement\(true\);\s+\}\}\s+className="w-full flex items-center space-x-3 px-4 py-3 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-lg font-medium transition-colors duration-200 select-none"\s+style=\{\{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' \}\}\s+>\s+<User className="w-5 h-5" \/>\s+<span className="select-none" style=\{\{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' \}\}>Staff Management<\/span>\s+<\/button>)/;

const mobilePlannerButton = `$1
                
                <button
                  onClick={() => {
                    setShowQuickActions(false);
                    setShowRosterMobilePlanner(true);
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-3 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg font-medium transition-colors duration-200 select-none"
                  style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
                >
                  <Grid className="w-5 h-5" />
                  <span className="select-none" style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}>Roster Planner (Mobile)</span>
                </button>`;

if (content.match(staffButtonPattern)) {
  content = content.replace(staffButtonPattern, mobilePlannerButton);
  console.log('✅ Added Roster Planner (Mobile) button to Quick Actions');
} else {
  console.log('⚠️  Could not find Staff Management button - may already be added');
}

// 3. Add modal component before closing div
const closingPattern = /(\s+<\/div>\s+\);\s+\};)$/m;
const modalComponent = `
      
      {/* Roster Mobile Planner Modal */}
      {showRosterMobilePlanner && (
        <RosterMobilePlanner
          onClose={() => setShowRosterMobilePlanner(false)}
          institutionCode={null}
        />
      )}
    </div>
  );
};`;

if (content.match(closingPattern)) {
  content = content.replace(closingPattern, modalComponent);
  console.log('✅ Added RosterMobilePlanner modal component');
} else {
  console.log('⚠️  Could not find closing pattern - may already be added');
}

// Write the file back
fs.writeFileSync(filePath, content, 'utf8');

console.log('\n✨ Successfully integrated RosterMobilePlanner into RosterPanel!');
console.log('\n📋 Summary:');
console.log('   • Import statement already added');
console.log('   • State variable added');
console.log('   • Quick Actions button added');
console.log('   • Modal component added');
console.log('\n🚀 You can now use the "Roster Planner (Mobile)" button in Quick Actions!');
