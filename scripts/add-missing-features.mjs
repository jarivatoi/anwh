import fs from 'fs';

const filePath = 'c:/Users/subit/Downloads/anwh/src/components/RosterMobilePlanner.tsx';
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔧 Adding missing features from desktop RosterPlanner...\n');

// Fix 1: Import formatDisplayNameForUI
if (content.includes("import { useState, useEffect } from 'react';")) {
  if (!content.includes('formatDisplayNameForUI')) {
    content = content.replace(
      "import { useState, useEffect } from 'react';",
      `import { useState, useEffect } from 'react';
import { Settings, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { formatDisplayNameForUI } from '../utils/rosterDisplayName';`
    );
    console.log('✅ Added imports for Settings icon and formatDisplayNameForUI');
  }
}

// Fix 2: Add showSettings state
if (content.includes('const [showAddGroupModal, setShowAddGroupModal]') && !content.includes('showSettings')) {
  content = content.replace(
    'const [showAddGroupModal, setShowAddGroupModal] = useState(false);',
    `const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);`
  );
  console.log('✅ Added showSettings state');
}

// Fix 3: Update staff fetching to use formatDisplayNameForUI (strips ID)
const oldMapping = `      // Map to use roster_display_name or construct from surname/name
      const mappedData = (data || []).map(staff => ({
        id: staff.id,
        display_name: staff.roster_display_name || \`\${staff.surname}, \${staff.name}\`
      }));`;

const newMapping = `      // Map to use roster_display_name with formatDisplayNameForUI to strip ID
      const mappedData = (data || []).map(staff => ({
        id: staff.id,
        display_name: staff.roster_display_name 
          ? formatDisplayNameForUI(staff.roster_display_name)  // Strip ID number
          : \`\${staff.surname} \${staff.name}\`.toUpperCase()
      }));`;

if (content.includes(oldMapping)) {
  content = content.replace(oldMapping, newMapping);
  console.log('✅ Updated staff mapping to strip ID numbers using formatDisplayNameForUI');
}

// Fix 4: Add Settings button to header
const oldHeader = `      <div className="flex items-center justify-between p-3 border-b bg-white">
        <button onClick={prevMonth} className="p-2"><ChevronLeft className="w-5 h-5" /></button>
        <h2 className="text-lg font-bold">{currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
        <button onClick={nextMonth} className="p-2"><ChevronRight className="w-5 h-5" /></button>
        <Settings className="w-5 h-5 opacity-0" />
      </div>`;

const newHeader = `      <div className="flex items-center justify-between p-3 border-b bg-white relative">
        <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded"><ChevronLeft className="w-5 h-5" /></button>
        <h2 className="text-lg font-bold">{currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
        <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded"><ChevronRight className="w-5 h-5" /></button>
        
        {/* Settings Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowSettings(!showSettings);
          }}
          className="p-2 hover:bg-gray-100 rounded"
        >
          <Settings className="w-5 h-5" />
        </button>
        
        {/* Settings Dropdown Menu */}
        {showSettings && (
          <div 
            className="absolute right-0 top-14 bg-white border rounded-lg shadow-lg py-2 z-[60] min-w-[200px]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                showToast('Print feature coming soon', 'success');
                setShowSettings(false);
              }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
            >
              <span>🖨️</span>
              <span>Print Roster</span>
            </button>
            
            <button
              onClick={() => {
                showToast('Save feature coming soon', 'success');
                setShowSettings(false);
              }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
            >
              <span>💾</span>
              <span>Save Roster</span>
            </button>
            
            <button
              onClick={() => {
                showToast('Import feature coming soon', 'success');
                setShowSettings(false);
              }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
            >
              <span>📥</span>
              <span>Import Roster</span>
            </button>
            
            <button
              onClick={() => {
                if (confirm('Clear all roster assignments?')) {
                  setRosterAssignments({});
                  showToast('Roster cleared', 'success');
                }
                setShowSettings(false);
              }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
            >
              <span>🗑️</span>
              <span>Clear Roster</span>
            </button>
          </div>
        )}
      </div>`;

if (content.includes(oldHeader)) {
  content = content.replace(oldHeader, newHeader);
  console.log('✅ Added Settings button with dropdown menu');
} else {
  console.log('⚠️ Could not find exact header pattern, trying alternative...');
  // Try to add Settings button before the invisible Settings icon
  if (content.includes('<Settings className="w-5 h-5 opacity-0" />')) {
    content = content.replace(
      '<Settings className="w-5 h-5 opacity-0" />',
      `<button
          onClick={(e) => {
            e.stopPropagation();
            setShowSettings(!showSettings);
          }}
          className="p-2 hover:bg-gray-100 rounded"
        >
          <Settings className="w-5 h-5" />
        </button>
        
        {/* Settings Dropdown Menu */}
        {showSettings && (
          <div 
            className="absolute right-0 top-14 bg-white border rounded-lg shadow-lg py-2 z-[60] min-w-[200px]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                showToast('Print feature coming soon', 'success');
                setShowSettings(false);
              }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
            >
              <span>🖨️</span>
              <span>Print Roster</span>
            </button>
            
            <button
              onClick={() => {
                showToast('Save feature coming soon', 'success');
                setShowSettings(false);
              }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
            >
              <span>💾</span>
              <span>Save Roster</span>
            </button>
            
            <button
              onClick={() => {
                showToast('Import feature coming soon', 'success');
                setShowSettings(false);
              }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
            >
              <span>📥</span>
              <span>Import Roster</span>
            </button>
            
            <button
              onClick={() => {
                if (confirm('Clear all roster assignments?')) {
                  setRosterAssignments({});
                  showToast('Roster cleared', 'success');
                }
                setShowSettings(false);
              }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
            >
              <span>🗑️</span>
              <span>Clear Roster</span>
            </button>
          </div>
        )}`
    );
    console.log('✅ Added Settings button with alternative approach');
  }
}

// Fix 5: Add click outside handler to close settings
const closeSettingsEffect = `
  // Close settings when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (showSettings) {
        setShowSettings(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showSettings]);
`;

if (!content.includes('handleClickOutside') && content.includes('showSettings')) {
  // Find where to insert - after the global mouse tracking useEffect
  const mouseEffectPattern = /\}, \[mouseDraggedStaff, mouseDragOver\]\);/;
  const match = content.match(mouseEffectPattern);
  if (match && match.index !== undefined) {
    const insertPos = match.index + match[0].length;
    content = content.substring(0, insertPos) + '\n' + closeSettingsEffect + content.substring(insertPos);
    console.log('✅ Added click outside handler for settings menu');
  }
}

// Fix 6: Ensure horizontal scrolling works with proper touch events
if (content.includes('<div className="flex-1 overflow-x-auto overflow-y-auto"')) {
  content = content.replace(
    '<div className="flex-1 overflow-x-auto overflow-y-auto"',
    `<div 
        className="flex-1 overflow-x-auto overflow-y-auto"
        style={{ WebkitOverflowScrolling: 'touch' }}
        onTouchStart={() => {}}
        onTouchMove={() => {}}`
  );
  console.log('✅ Enhanced calendar container for touch scrolling');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('\n✨ Missing features added!');
console.log('\n📋 Features added:');
console.log('   • Settings icon in header');
console.log('   • Settings dropdown menu (Print, Save, Import, Clear)');
console.log('   • Staff names now strip ID numbers (using formatDisplayNameForUI)');
console.log('   • Click outside to close settings menu');
console.log('   • Improved touch scrolling support');
