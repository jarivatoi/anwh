import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, '..', 'src', 'components', 'AdminPanel.tsx');

console.log('🔧 Fixing AdminPanel button structure...\n');

let content = fs.readFileSync(filePath, 'utf8');

// Find and replace the broken section
const brokenPattern = /              \{\/\* Admin Only - 8\. Roster Planner \*\/\}\s+\{currentUser\?\.id_number === '5274' && \(\s+<button\s+\s+\{\/\* Admin Only - 8b\. Roster Planner \(Mobile\) \*\/\}[\s\S]*?Roster Planner\n              <\/button>\s+\)\}\s+\/\* 9\. Clear Database \*\//;

const fixedSection = `              {/* Admin Only - 8. Roster Planner */}
              {currentUser?.id_number === '5274' && (
              <button
                onClick={() => {
                  setShowRosterPlanner(true)
                  setShowQuickActions(false)
                }}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  textAlign: 'left',
                  background: 'white',
                  border: 'none',
                  borderBottom: '1px solid #f3f4f6',
                  color: '#1f2937',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#fef3c7'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
              >
                <LayoutTemplate className="w-4 h-4" />
                Roster Planner
              </button>
                        )}
              
              {/* Admin Only - 8b. Roster Planner (Mobile) */}
              {currentUser?.id_number === '5274' && (
              <button
                onClick={() => {
                  setShowRosterMobilePlanner(true)
                  setShowQuickActions(false)
                }}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  textAlign: 'left',
                  background: 'white',
                  border: 'none',
                  borderBottom: '1px solid #f3f4f6',
                  color: '#1f2937',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#ccfbf1'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
              >
                <LayoutTemplate className="w-4 h-4" />
                Roster Planner (Mobile)
              </button>
                        )}
              {/* 9. Clear Database */}`;

if (content.match(brokenPattern)) {
  content = content.replace(brokenPattern, fixedSection);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Fixed button structure!');
} else {
  console.log('❌ Could not find broken pattern - trying alternative approach...');
  
  // Alternative: Just remove everything between first button tag and "Roster Planner" text
  const altPattern = /(              <button)\s+\s+(\/\* Admin Only - 8b[\s\S]*?Roster Planner\n              <\/button>\s+\)\})/;
  
  if (content.match(altPattern)) {
    const replacement = `$1
                onClick={() => {
                  setShowRosterPlanner(true)
                  setShowQuickActions(false)
                }}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  textAlign: 'left',
                  background: 'white',
                  border: 'none',
                  borderBottom: '1px solid #f3f4f6',
                  color: '#1f2937',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#fef3c7'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
              >
                <LayoutTemplate className="w-4 h-4" />
                $2`;
    
    content = content.replace(altPattern, replacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Fixed with alternative approach!');
  } else {
    console.log('❌ Could not fix automatically. Manual intervention needed.');
  }
}
