import fs from 'fs';

const filePath = 'c:/Users/subit/Downloads/anwh/src/components/RosterMobilePlanner.tsx';
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔧 Fixing mouse drag functionality...\n');

// Fix 1: Add useEffect for global mouse event listeners
const useEffectImport = "import { useState, useEffect } from 'react';";
if (content.includes("import { useState, useEffect } from 'react'")) {
  // Already imported
} else if (content.includes("import { useState } from 'react'")) {
  content = content.replace(
    "import { useState } from 'react';",
    "import { useState, useEffect } from 'react';"
  );
  console.log('✅ Added useEffect import');
}

// Add useEffect for global mouse tracking
const globalMouseEffect = `
  // Global mouse tracking for drag
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!mouseDraggedStaff) return;
      
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const cell = el?.closest('[data-cell]');
      if (cell) {
        setMouseDragOver({
          dateKey: (cell as HTMLElement).dataset.dateKey || '',
          shiftId: (cell as HTMLElement).dataset.shiftId || ''
        });
      } else {
        setMouseDragOver(null);
      }
    };

    const handleGlobalMouseUp = () => {
      if (mouseDraggedStaff && mouseDragOver) {
        const { dateKey, shiftId } = mouseDragOver;
        if (mouseDraggedStaff.groupMembers) {
          mouseDraggedStaff.groupMembers.forEach(m => addStaffToCell(m, dateKey, shiftId));
          showToast(\`Added \${mouseDraggedStaff.groupMembers.length} staff\`, 'success');
        } else {
          addStaffToCell(mouseDraggedStaff.name, dateKey, shiftId);
        }
      }
      setMouseDraggedStaff(null);
      setMouseDragOver(null);
    };

    if (mouseDraggedStaff) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [mouseDraggedStaff, mouseDragOver]);
`;

// Insert after the state declarations
if (!content.includes('handleGlobalMouseMove')) {
  const statePattern = /const \[mouseDragOver, setMouseDragOver\] = useState.*?;\s*\n/;
  const match = content.match(statePattern);
  if (match && match.index !== undefined) {
    const insertPos = match.index + match[0].length;
    content = content.substring(0, insertPos) + globalMouseEffect + content.substring(insertPos);
    console.log('✅ Added global mouse tracking useEffect');
  }
}

// Fix 2: Remove onMouseEnter and onMouseUp from calendar cells (now handled globally)
if (content.includes('onMouseEnter={(e) => handleMouseMove(e, dateKey, shift.id)}')) {
  content = content.replace(
    '                      onMouseEnter={(e) => handleMouseMove(e, dateKey, shift.id)}\n                      onMouseUp={handleMouseUp}',
    ''
  );
  console.log('✅ Removed redundant cell-level mouse handlers');
}

// Fix 3: Remove onMouseUp from staff items (now handled globally)
if (content.includes('                    onMouseDown={() => handleMouseDown(staff.display_name)}\n                    onMouseUp={handleMouseUp}')) {
  content = content.replace(
    '                    onMouseDown={() => handleMouseDown(staff.display_name)}\n                    onMouseUp={handleMouseUp}',
    '                    onMouseDown={() => handleMouseDown(staff.display_name)}'
  );
  console.log('✅ Removed redundant staff item mouseUp handler');
}

// Fix 4: Remove onMouseUp from group items
if (content.includes('                     onMouseUp={handleMouseUp}\n                     onTouchStart')) {
  content = content.replace(
    '                     onMouseUp={handleMouseUp}\n                     onTouchStart',
    '                     onTouchStart'
  );
  console.log('✅ Removed redundant group item mouseUp handler');
}

// Fix 5: Add cursor style during drag
if (content.includes('className="fixed inset-0 bg-white z-50 flex flex-col select-none"')) {
  content = content.replace(
    'className="fixed inset-0 bg-white z-50 flex flex-col select-none"',
    `className={\`fixed inset-0 bg-white z-50 flex flex-col select-none \${
        mouseDraggedStaff ? 'cursor-grabbing' : ''
      }\`}`
  );
  console.log('✅ Added cursor feedback during drag');
}

// Fix 6: Add data attributes to calendar cells for identification
if (content.includes('data-cell="true"') && !content.includes('data-date-key')) {
  const oldTdPattern = /<td\s+key=\{key\}\s+data-cell="true"/g;
  if (content.match(oldTdPattern)) {
    content = content.replace(
      oldTdPattern,
      `<td
                      key={key}
                      data-cell="true"
                      data-date-key={dateKey}
                      data-shift-id={shift.id}`
    );
    console.log('✅ Added data attributes to calendar cells');
  }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('\n✨ Mouse drag fixed!');
console.log('\n🖱️ Changes made:');
console.log('   • Added global mousemove/mouseup listeners');
console.log('   • Track drag position anywhere on screen');
console.log('   • Cursor changes to grabbing during drag');
console.log('   • Data attributes added for cell identification');
console.log('   • Removed redundant element-level handlers');
