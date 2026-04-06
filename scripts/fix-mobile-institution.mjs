import fs from 'fs';

const filePath = 'c:/Users/subit/Downloads/anwh/src/components/AdminPanel.tsx';
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔧 Fixing RosterMobilePlanner institutionCode prop...\n');

// Replace null with currentUser?.institution_code || null
if (content.includes('institutionCode={null}')) {
  content = content.replace(
    'institutionCode={null}',
    'institutionCode={currentUser?.institution_code || null}'
  );
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Fixed institutionCode to use currentUser?.institution_code');
} else {
  console.log('❌ Could not find institutionCode={null}');
}

console.log('\n✨ AdminPanel updated!');
