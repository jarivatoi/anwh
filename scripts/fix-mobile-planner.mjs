import fs from 'fs';

const filePath = 'c:/Users/subit/Downloads/anwh/src/components/RosterMobilePlanner.tsx';
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔧 Fixing RosterMobilePlanner to match desktop...\n');

// 1. Fix shift labels
content = content.replace(
  /const shifts = \[\s+\{ id: 'morning', label: 'Morning', color: 'bg-blue-50' \},\s+\{ id: 'evening', label: 'Evening', color: 'bg-yellow-50' \},\s+\{ id: 'night', label: 'Night', color: 'bg-purple-50' \}\s+\];/,
  `const shifts = [
    { id: 'morning', label: '9hrs-16hrs', color: 'bg-blue-50' },
    { id: 'evening', label: '16hrs-22hrs', color: 'bg-orange-50' },
    { id: 'night', label: '22hrs-9hrs', color: 'bg-purple-50' }
  ];`
);
console.log('✅ Fixed shift labels');

// 2. Fix header text in staff panel
content = content.replace(
  /<h3 className="font-semibold text-sm">\{showGroups \? 'Groups' : showReplacing \? 'Staff \(R\)' : 'Staff'\}<\/h3>/,
  `<h3 className="font-semibold text-sm">
              {showGroups 
                ? (groups.length === 1 ? 'Available Group' : 'Available Groups') 
                : showReplacing 
                  ? 'Available Staff (R)' 
                  : 'Available Staff'}
            </h3>`
);
console.log('✅ Fixed header text');

// 3. Add hint text below header
content = content.replace(
  /(<h3 className="font-semibold text-sm">[\s\S]*?<\/h3>)\s+<button/,
  `$1
          <p className="text-xs text-gray-600 mt-1">
            {showGroups 
              ? 'Drag to assign all staff in group' 
              : showReplacing
                ? selectedStaff.size > 0 
                  ? \`\${selectedStaff.size} selected - Will add with (R) marker\` 
                  : 'Tap names - will add with (R) marker'
                : selectedStaff.size > 0 
                  ? \`\${selectedStaff.size} selected\` 
                  : 'Long press to select, drag to assign'}
          </p>
          <button`
);
console.log('✅ Added hint text');

// 4. Make sure staff list is properly rendered with names
// Check if staffList.map exists and has proper rendering
if (!content.includes('staffList.map(staff =>')) {
  console.log('❌ Staff list rendering not found');
} else {
  console.log('✅ Staff list rendering confirmed');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('\n✨ RosterMobilePlanner updated to match desktop version!');
