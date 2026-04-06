import fs from 'fs';

const filePath = 'c:/Users/subit/Downloads/anwh/src/components/RosterMobilePlanner.tsx';
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔧 Fixing horizontal scroll for calendar and staff list...\n');

// Fix 1: Make calendar table horizontally scrollable
if (content.includes('<div className="flex-1 overflow-auto">')) {
  content = content.replace(
    '<div className="flex-1 overflow-auto">',
    '<div className="flex-1 overflow-x-auto overflow-y-auto">'
  );
  console.log('✅ Made calendar container horizontally scrollable');
}

// Fix 2: Ensure table doesn't shrink and allows horizontal scroll
if (content.includes('<table className="w-full text-xs">')) {
  content = content.replace(
    '<table className="w-full text-xs">',
    '<table className="w-full text-xs min-w-max">'
  );
  console.log('✅ Added min-w-max to table for horizontal scroll');
}

// Fix 3: Add touch-action manipulation to prevent unwanted gestures
if (content.includes('className="fixed inset-0 bg-white z-50 flex flex-col select-none"')) {
  content = content.replace(
    'className="fixed inset-0 bg-white z-50 flex flex-col select-none"',
    'className="fixed inset-0 bg-white z-50 flex flex-col select-none touch-pan-y"'
  );
  console.log('✅ Added touch-pan-y to main container');
}

// Fix 4: Ensure staff panel has proper touch handling
if (content.includes('className="border-t bg-gray-50 max-h-[180px] flex flex-col"')) {
  content = content.replace(
    'className="border-t bg-gray-50 max-h-[180px] flex flex-col"',
    'className="border-t bg-gray-50 max-h-[180px] flex flex-col touch-pan-x"'
  );
  console.log('✅ Added touch-pan-x to staff panel');
}

// Fix 5: Make sure each date column has minimum width
if (content.includes('className="border p-1 bg-gray-100 min-w-[60px]"')) {
  content = content.replace(
    'className="border p-1 bg-gray-100 min-w-[60px]"',
    'className="border p-1 bg-gray-100 min-w-[70px] whitespace-nowrap"'
  );
  console.log('✅ Increased date column width and added whitespace-nowrap');
}

// Fix 6: Ensure sticky first column works properly
if (content.includes('className="border p-2 bg-gray-100 font-bold sticky left-0 text-xs"')) {
  content = content.replace(
    'className="border p-2 bg-gray-100 font-bold sticky left-0 text-xs"',
    'className="border p-2 bg-gray-100 font-bold sticky left-0 z-20 text-xs min-w-[70px]"'
  );
  console.log('✅ Enhanced sticky column with z-index and min-width');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('\n✨ Horizontal scrolling fixed!');
console.log('\n📱 Improvements:');
console.log('   • Calendar table scrolls horizontally');
console.log('   • Staff list scrolls horizontally');
console.log('   • Date columns have proper minimum width');
console.log('   • Touch gestures optimized for scrolling');
console.log('   • Sticky shift column stays visible');
