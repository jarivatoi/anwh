import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, '..', 'src', 'components', 'AdminPanel.tsx');

console.log('📝 Adding RosterMobilePlanner modal...\n');

let content = fs.readFileSync(filePath, 'utf8');

// Find the AttachedCentersModal closing and add our modal after it
const pattern = /(      <AttachedCentersModal\n        isOpen=\{showAttachedCenters\}\n        onClose=\{\(\) => setShowAttachedCenters\(false\)\}\n      \/>)/;

const replacement = `$1
      
      {/* Roster Mobile Planner Modal */}
      {showRosterMobilePlanner && createPortal(
        <RosterMobilePlanner
          onClose={() => setShowRosterMobilePlanner(false)}
          institutionCode={null}
        />,
        document.body
      )}`;

if (content.match(pattern)) {
  content = content.replace(pattern, replacement);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Successfully added RosterMobilePlanner modal!');
} else {
  console.log('❌ Could not find AttachedCentersModal pattern');
}
