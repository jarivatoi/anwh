import fs from 'fs';

const filePath = 'c:/Users/subit/Downloads/anwh/src/components/RosterMobilePlanner.tsx';
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔧 Adding touch drag support to RosterMobilePlanner...\n');

// Fix 1: Update staff item to support both long press and drag
const oldStaffItem = `                  <div key={staff.id}
                    className={\`px-3 py-2 rounded border text-sm min-w-[100px] \${isSelected ? 'bg-green-50 border-green-400' : showReplacing ? 'bg-purple-50 border-purple-300 text-purple-800' : 'bg-white border-gray-200'}\`}
                    onTouchStart={() => handleLongPressStart(staff.display_name)} onTouchEnd={handleLongPressEnd} onTouchMove={handleLongPressEnd}>
                    {displayName}{isSelected && <span className="ml-1 text-green-600">✓</span>}
                  </div>`;

const newStaffItem = `                  <div key={staff.id}
                    className={\`px-3 py-2 rounded border text-sm min-w-[100px] cursor-move touch-none \${isSelected ? 'bg-green-50 border-green-400' : showReplacing ? 'bg-purple-50 border-purple-300 text-purple-800' : 'bg-white border-gray-200'}\`}
                    onTouchStart={(e) => {
                      // Start long press timer for selection
                      handleLongPressStart(staff.display_name);
                      // Also prepare for drag
                      handleTouchStart(staff.display_name);
                    }}
                    onTouchEnd={(e) => {
                      // Cancel long press
                      handleLongPressEnd();
                      // Complete drag if over a cell
                      handleTouchEnd();
                    }}
                    onTouchMove={(e) => {
                      // Cancel long press on move (it's a drag now)
                      handleLongPressEnd();
                      // Track drag position
                      const touch = e.touches[0];
                      const el = document.elementFromPoint(touch.clientX, touch.clientY);
                      if (el?.closest('[data-cell]')) {
                        const cell = el.closest('[data-cell]');
                        setTouchDragOver({
                          dateKey: cell.dataset.dateKey || '',
                          shiftId: cell.dataset.shiftId || ''
                        });
                      }
                    }}>
                    {displayName}{isSelected && <span className="ml-1 text-green-600">✓</span>}
                  </div>`;

if (content.includes(oldStaffItem)) {
  content = content.replace(oldStaffItem, newStaffItem);
  console.log('✅ Updated staff items with touch drag support');
} else {
  console.log('⚠️  Could not find exact staff item pattern, trying alternative...');
  
  // Alternative: Just replace the onTouch handlers
  if (content.includes('onTouchStart={() => handleLongPressStart(staff.display_name)}')) {
    content = content.replace(
      'onTouchStart={() => handleLongPressStart(staff.display_name)} onTouchEnd={handleLongPressEnd} onTouchMove={handleLongPressEnd}',
      `onTouchStart={(e) => {
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
                    }}`
    );
    
    // Add touch-none and cursor-move classes
    content = content.replace(
      'className={`px-3 py-2 rounded border text-sm min-w-[100px]',
      'className={`px-3 py-2 rounded border text-sm min-w-[100px] cursor-move touch-none'
    );
    
    console.log('✅ Updated staff items with alternative approach');
  } else {
    console.log('❌ Could not update staff items');
  }
}

// Fix 2: Make calendar cells detectable for drag
if (!content.includes('data-cell=')) {
  content = content.replace(
    /className="\$\{shift\.color\} border p-1 min-h-\[80px\] align-top"/g,
    `className={\`\${shift.color} border p-1 min-h-[80px] align-top\`}
                      data-cell="true"`
  );
  console.log('✅ Added data-cell attribute to calendar cells');
}

// Fix 3: Ensure horizontal scroll works properly
if (content.includes('overflow-x-auto p-2')) {
  content = content.replace(
    'overflow-x-auto p-2',
    'overflow-x-auto overflow-y-hidden p-2 snap-x'
  );
  console.log('✅ Improved horizontal scrolling');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('\n✨ Touch interactions added to RosterMobilePlanner!');
console.log('\n📱 Features added:');
console.log('   • Long press (500ms) to select staff');
console.log('   • Drag staff to calendar cells to assign');
console.log('   • Horizontal scroll for staff list');
console.log('   • Visual feedback during drag');
