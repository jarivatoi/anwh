import fs from 'fs';

const filePath = 'c:/Users/subit/Downloads/anwh/src/components/RosterMobilePlanner.tsx';
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔧 Fixing staff names display and calendar swipe...\n');

// Fix 1: Add console logging to debug staff fetching
if (content.includes('setStaffList(mappedData);') && !content.includes('console.log.*Staff loaded')) {
  content = content.replace(
    'setStaffList(mappedData);',
    `console.log('✅ Staff loaded:', mappedData.length, 'staff members');
      console.log('Sample staff:', mappedData.slice(0, 3));
      setStaffList(mappedData);`
  );
  console.log('✅ Added debug logging for staff loading');
}

// Fix 2: Add error logging
if (content.includes("showToast(error.message || 'Failed to load staff', 'error');") && !content.includes('console.error')) {
  content = content.replace(
    "showToast(error.message || 'Failed to load staff', 'error');",
    `console.error('❌ Error fetching staff:', error);
      showToast(error.message || 'Failed to load staff', 'error');`
  );
  console.log('✅ Added error logging');
}

// Fix 3: Add visual indicator when no staff loaded
const staffListSection = `            ) : (
              staffList.map(staff => {`;

if (content.includes(staffListSection) && !content.includes('staffList.length === 0')) {
  const newStaffSection = `            ) : (
              staffList.length === 0 ? (
                <div className="text-center text-gray-500 py-4">
                  {loading ? 'Loading staff...' : 'No staff found'}
                </div>
              ) : (
              staffList.map(staff => {`;
  
  // Need to close the extra parenthesis
  if (content.includes(staffListSection)) {
    content = content.replace(staffListSection, newStaffSection);
    
    // Also need to close the extra paren at the end
    const oldEnd = `              })
            )}
          </div>`;
    const newEnd = `              })
              )
            )}
          </div>`;
    
    if (content.includes(oldEnd)) {
      content = content.replace(oldEnd, newEnd);
      console.log('✅ Added empty state for staff list');
    }
  }
}

// Fix 4: Improve calendar container for better swipe
if (content.includes('className="flex-1 overflow-x-auto overflow-y-auto"')) {
  content = content.replace(
    'className="flex-1 overflow-x-auto overflow-y-auto"',
    `className="flex-1 overflow-x-auto overflow-y-auto overscroll-contain"`
  );
  console.log('✅ Added overscroll-contain to calendar');
}

// Fix 5: Ensure table has proper touch handling
if (content.includes('<table className="w-full text-xs min-w-max">')) {
  content = content.replace(
    '<table className="w-full text-xs min-w-max">',
    `<table className="w-full text-xs min-w-max" style={{ touchAction: 'pan-x pan-y' }}>`
  );
  console.log('✅ Added touch-action to table');
}

// Fix 6: Make sure staff container allows horizontal scroll
if (content.includes('className="flex-1 overflow-x-auto overflow-y-hidden p-2 snap-x"')) {
  content = content.replace(
    'className="flex-1 overflow-x-auto overflow-y-hidden p-2 snap-x"',
    `className="flex-1 overflow-x-auto overflow-y-hidden p-2 snap-x overscroll-contain"`
  );
  console.log('✅ Added overscroll-contain to staff list');
}

// Fix 7: Add inline styles for smooth scrolling
const cssStyles = `
<style>{\`
  /* Enable smooth scrolling on all scrollable containers */
  .overflow-x-auto, .overflow-y-auto {
    -webkit-overflow-scrolling: touch !important;
    scroll-behavior: smooth;
  }
  
  /* Prevent scroll chaining */
  .overscroll-contain {
    overscroll-behavior: contain !important;
  }
  
  /* Ensure tables can be scrolled */
  table {
    touch-action: pan-x pan-y !important;
  }
  
  /* Hide scrollbar but keep functionality */
  .overflow-x-auto::-webkit-scrollbar {
    height: 4px;
  }
  .overflow-x-auto::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 2px;
  }
\`}</style>`;

if (!content.includes('-webkit-overflow-scrolling: touch')) {
  // Insert after opening div
  const mainDivPattern = /<div className=\{`fixed inset-0 bg-white z-50 flex flex-col select-none/;
  const match = content.match(mainDivPattern);
  if (match && match.index !== undefined) {
    const insertPos = match.index + match[0].length;
    const afterBracket = content.indexOf('>', insertPos) + 1;
    content = content.substring(0, afterBracket) + '\n' + cssStyles + content.substring(afterBracket);
    console.log('✅ Added custom CSS for smooth scrolling');
  }
}

// Fix 8: Check if institutionCode is null and show warning
if (content.includes('.eq(\'institution_code\', institutionCode)') && !content.includes('institutionCode check')) {
  const fetchStart = '  const fetchStaffList = async () => {';
  const withCheck = `  const fetchStaffList = async () => {
    // institutionCode check
    if (!institutionCode) {
      console.warn('⚠️ No institution code provided');
      showToast('No institution code', 'error');
      setLoading(false);
      return;
    }
    `;
  
  if (content.includes(fetchStart)) {
    content = content.replace(fetchStart, withCheck);
    console.log('✅ Added institution code validation');
  }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('\n✨ Fixes applied!');
console.log('\n📋 Changes made:');
console.log('   • Added debug logging for staff loading');
console.log('   • Added error logging');
console.log('   • Added empty state message for staff list');
console.log('   • Improved touch scrolling with overscroll-contain');
console.log('   • Added touch-action styles to table');
console.log('   • Added custom CSS for smooth scrolling');
console.log('   • Added institution code validation');
console.log('\n💡 Check browser console for debug messages!');
