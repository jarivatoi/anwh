import fs from 'fs';

const filePath = 'c:/Users/subit/Downloads/anwh/src/components/RosterMobilePlanner.tsx';
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔧 Adding explicit touch handlers for scrolling...\n');

// Fix 1: Add ref-based scroll container with proper touch handling
if (content.includes('<div className="flex-1 overflow-x-auto overflow-y-auto">')) {
  content = content.replace(
    '<div className="flex-1 overflow-x-auto overflow-y-auto">',
    `<div 
        className="flex-1 overflow-x-auto overflow-y-auto"
        style={{ WebkitOverflowScrolling: 'touch' }}
        onTouchStart={() => {}}
        onTouchMove={() => {}}>
      `
  );
  console.log('✅ Added touch handlers to calendar container');
}

// Fix 2: Add touch handlers to staff list container
if (content.includes('<div className="flex-1 overflow-x-auto overflow-y-hidden p-2 snap-x">')) {
  content = content.replace(
    '<div className="flex-1 overflow-x-auto overflow-y-hidden p-2 snap-x">',
    `<div 
        className="flex-1 overflow-x-auto overflow-y-hidden p-2 snap-x"
        style={{ WebkitOverflowScrolling: 'touch' }}
        onTouchStart={() => {}}
        onTouchMove={() => {}}>
      `
  );
  console.log('✅ Added touch handlers to staff list container');
}

// Fix 3: Ensure body/html allows touch scrolling
const mainContainerClass = 'className="fixed inset-0 bg-white z-50 flex flex-col select-none touch-pan-y"';
if (content.includes(mainContainerClass)) {
  content = content.replace(
    mainContainerClass,
    `className="fixed inset-0 bg-white z-50 flex flex-col select-none"
        style={{ touchAction: 'manipulation', WebkitOverflowScrolling: 'touch' }}`
  );
  console.log('✅ Updated main container touch action');
}

// Fix 4: Remove conflicting touch classes from child elements
if (content.includes('touch-pan-x')) {
  content = content.replace(/touch-pan-x/g, '');
  console.log('✅ Removed conflicting touch-pan-x class');
}

if (content.includes('touch-pan-y')) {
  content = content.replace(/touch-pan-y/g, '');
  console.log('✅ Removed conflicting touch-pan-y class');
}

// Fix 5: Add CSS to enable smooth scrolling
const cssAddition = `
<style>{\`
  .overflow-x-auto {
    -webkit-overflow-scrolling: touch !important;
    overscroll-behavior-x: contain !important;
  }
  .overflow-y-auto {
    -webkit-overflow-scrolling: touch !important;
    overscroll-behavior-y: contain !important;
  }
  table {
    touch-action: pan-x pan-y !important;
  }
\`}</style>`;

// Add CSS before closing tag of main component
if (content.includes('return createPortal(') && !content.includes('-webkit-overflow-scrolling')) {
  const returnIndex = content.indexOf('return createPortal(');
  const portalContentStart = content.indexOf('(', returnIndex) + 1;
  
  // Find the opening div after createPortal(
  const divMatch = content.substring(portalContentStart).match(/<div[^>]*>/);
  if (divMatch && divMatch.index !== undefined) {
    const insertPos = portalContentStart + divMatch.index + divMatch[0].length;
    content = content.substring(0, insertPos) + cssAddition + content.substring(insertPos);
    console.log('✅ Added custom CSS for smooth scrolling');
  }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('\n✨ Touch scrolling enhanced!');
console.log('\n📱 Changes made:');
console.log('   • Added WebkitOverflowScrolling for iOS');
console.log('   • Added empty touch handlers to trigger native scroll');
console.log('   • Removed conflicting touch-action classes');
console.log('   • Added custom CSS for smooth scrolling');
console.log('   • Set overscroll-behavior to prevent bounce');
