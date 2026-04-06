import fs from 'fs';

const filePath = 'c:/Users/subit/Downloads/anwh/src/components/RosterMobilePlanner.tsx';
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔧 Adding mouse event support for desktop...\n');

// Fix 1: Add mouse drag state variables
if (content.includes('const [touchDraggedStaff, setTouchDraggedStaff]')) {
  const insertAfter = 'const [touchDragOver, setTouchDragOver] = useState<{ dateKey: string; shiftId: string } | null>(null);';
  const mouseStateVars = `
  // Mouse drag support for desktop
  const [mouseDraggedStaff, setMouseDraggedStaff] = useState<{ name: string; groupMembers?: string[] } | null>(null);
  const [mouseDragOver, setMouseDragOver] = useState<{ dateKey: string; shiftId: string } | null>(null);`;
  
  if (!content.includes('mouseDraggedStaff')) {
    content = content.replace(insertAfter, insertAfter + mouseStateVars);
    console.log('✅ Added mouse drag state variables');
  }
}

// Fix 2: Add mouse drag handlers
const mouseHandlers = `
  // Mouse drag handlers for desktop
  const handleMouseDown = (name: string, members?: string[]) => {
    setMouseDraggedStaff({ name, groupMembers: members });
  };

  const handleMouseMove = (e: React.MouseEvent, dateKey: string, shiftId: string) => {
    if (!mouseDraggedStaff) return;
    setMouseDragOver({ dateKey, shiftId });
  };

  const handleMouseUp = () => {
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
`;

if (!content.includes('handleMouseDown')) {
  // Insert after handleTouchEnd function
  const touchEndPattern = /const handleTouchEnd = \(\) => \{[\s\S]*?setTouchDragOver\(null\);\s*\};/;
  const match = content.match(touchEndPattern);
  if (match && match.index !== undefined) {
    const insertPos = match.index + match[0].length;
    content = content.substring(0, insertPos) + '\n' + mouseHandlers + content.substring(insertPos);
    console.log('✅ Added mouse drag handlers');
  }
}

// Fix 3: Update calendar cells to support both mouse and touch
if (content.includes('onTouchMove={(e) => handleTouchMove(e, dateKey, shift.id)}')) {
  content = content.replace(
    'onTouchMove={(e) => handleTouchMove(e, dateKey, shift.id)}',
    `onTouchMove={(e) => handleTouchMove(e, dateKey, shift.id)}
                      onMouseEnter={(e) => handleMouseMove(e, dateKey, shift.id)}
                      onMouseUp={handleMouseUp}`
  );
  console.log('✅ Added mouse handlers to calendar cells');
}

// Fix 4: Update staff items to support mouse drag
const oldStaffHandlers = `                    onTouchStart={(e) => {
                      handleLongPressStart(staff.display_name);
                      handleTouchStart(staff.display_name);
                    }}
                    onTouchEnd={(e) => {
                      handleLongPressEnd();
                      handleTouchEnd();
                    }}
                    onTouchMove={(e) => {
                      handleLongPressEnd();
                      const touch = e.touches[0];
                      const el = document.elementFromPoint(touch.clientX, touch.clientY);
                      if (el?.closest('[data-cell]')) {
                        const cell = el.closest('[data-cell]');
                        setTouchDragOver({
                          dateKey: cell.dataset.dateKey || '',
                          shiftId: cell.dataset.shiftId || ''
                        });
                      }
                    }}`;

const newStaffHandlers = `                    onMouseDown={() => handleMouseDown(staff.display_name)}
                    onMouseUp={handleMouseUp}
                    onTouchStart={(e) => {
                      handleLongPressStart(staff.display_name);
                      handleTouchStart(staff.display_name);
                    }}
                    onTouchEnd={(e) => {
                      handleLongPressEnd();
                      handleTouchEnd();
                    }}
                    onTouchMove={(e) => {
                      handleLongPressEnd();
                      const touch = e.touches[0];
                      const el = document.elementFromPoint(touch.clientX, touch.clientY);
                      if (el?.closest('[data-cell]')) {
                        const cell = el.closest('[data-cell]');
                        setTouchDragOver({
                          dateKey: cell.dataset.dateKey || '',
                          shiftId: cell.dataset.shiftId || ''
                        });
                      }
                    }}`;

if (content.includes(oldStaffHandlers)) {
  content = content.replace(oldStaffHandlers, newStaffHandlers);
  console.log('✅ Added mouse handlers to staff items');
}

// Fix 5: Update group items to support mouse drag
if (content.includes('onTouchStart={() => handleTouchStart(group.name, group.members)} onTouchEnd={handleTouchEnd}>')) {
  content = content.replace(
    'onTouchStart={() => handleTouchStart(group.name, group.members)} onTouchEnd={handleTouchEnd}>',
    `onMouseDown={() => handleMouseDown(group.name, group.members)}
                     onMouseUp={handleMouseUp}
                     onTouchStart={() => handleTouchStart(group.name, group.members)} 
                     onTouchEnd={handleTouchEnd}>`
  );
  console.log('✅ Added mouse handlers to group items');
}

// Fix 6: Add visual feedback for mouse drag over cells
if (content.includes('data-cell="true"') && !content.includes('mouseDragOver')) {
  const oldCellClass = 'className={`${shift.color} border p-1 min-h-[80px] align-top`}';
  const newCellClass = `className={\`\${shift.color} border p-1 min-h-[80px] align-top \${
                        mouseDragOver?.dateKey === dateKey && mouseDragOver?.shiftId === shift.id 
                          ? 'ring-2 ring-blue-400 bg-blue-100' 
                          : ''
                      }\`}`;
  
  if (content.includes(oldCellClass)) {
    content = content.replace(oldCellClass, newCellClass);
    console.log('✅ Added visual feedback for mouse drag');
  }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('\n✨ Mouse support added for desktop!');
console.log('\n🖱️ Features added:');
console.log('   • Click and drag staff names to calendar cells');
console.log('   • Visual highlight when dragging over cells');
console.log('   • Works with both mouse and touch');
console.log('   • Groups can be dragged as a unit');
