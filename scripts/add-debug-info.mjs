import fs from 'fs';

const filePath = 'c:/Users/subit/Downloads/anwh/src/components/RosterMobilePlanner.tsx';
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔧 Adding comprehensive debug info...\n');

// Fix 1: Add prominent debug banner
const returnStatement = `  return (`;

if (content.includes(returnStatement) && !content.includes('DEBUG BANNER')) {
  const withBanner = `  // DEBUG BANNER - Shows current state
  console.log('📱 RosterMobilePlanner rendering...');
  console.log('   - institutionCode prop:', institutionCode);
  console.log('   - staffList length:', staffList.length);
  console.log('   - loading state:', loading);
  
  return (`;
  
  content = content.replace(returnStatement, withBanner);
  console.log('✅ Added render-time debug logging');
}

// Fix 2: Add visible status bar at top
const firstDiv = /return \(\s*<div className=\{`fixed inset-0/;
const match = content.match(firstDiv);

if (match && !content.includes('STATUS BAR')) {
  const insertAfter = match.index !== undefined ? match.index + match[0].length : 0;
  const statusBar = `
      {/* STATUS BAR - Visible debug info */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        background: '#fef3c7',
        borderBottom: '2px solid #f59e0b',
        padding: '8px 12px',
        fontSize: '12px',
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <strong>Institution:</strong> {institutionCode || 'NULL'} | 
          <strong> Staff:</strong> {staffList.length} | 
          <strong> Loading:</strong> {loading ? 'YES' : 'NO'}
        </div>
        <button 
          onClick={() => fetchStaffList()}
          style={{
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            padding: '4px 8px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px'
          }}
        >
          🔄 Reload Staff
        </button>
      </div>`;
  
  content = content.substring(0, insertAfter) + statusBar + content.substring(insertAfter);
  console.log('✅ Added visible status bar with reload button');
}

// Fix 3: Log the actual query being made
if (content.includes('.eq(\'institution_code\', institutionCode)') && !content.includes('Querying with')) {
  const beforeQuery = '      const { data, error } = await supabase';
  const withLog = `      console.log('🔍 Querying staff_users with institution_code:', institutionCode);
      const { data, error } = await supabase`;
  
  content = content.replace(beforeQuery, withLog);
  console.log('✅ Added query logging');
}

// Fix 4: Show what data was returned
if (content.includes("console.log('✅ Staff loaded:', mappedData.length, 'staff members');") && !content.includes('Raw data')) {
  const afterMapping = `      
      console.log('✅ Staff loaded:', mappedData.length, 'staff members');`;
  const withRawData = `      
      console.log('📊 Raw data from DB:', data?.length, 'records');
      console.log('📊 Sample raw data:', data?.slice(0, 2));
      console.log('✅ Staff loaded:', mappedData.length, 'staff members');`;
  
  content = content.replace(afterMapping, withRawData);
  console.log('✅ Added raw data logging');
}

// Fix 5: Add error details
if (content.includes("console.error('❌ Error fetching staff:', error);") && !content.includes('Error details')) {
  const oldError = "console.error('❌ Error fetching staff:', error);";
  const newError = `console.error('❌ Error fetching staff:');
      console.error('   - Error object:', error);
      console.error('   - Error message:', error.message);
      console.error('   - Error code:', error.code);`;
  
  content = content.replace(oldError, newError);
  console.log('✅ Enhanced error logging');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('\n✨ Debug info added!');
console.log('\n📋 What to check:');
console.log('   1. Yellow status bar at top shows institution code');
console.log('   2. Click "🔄 Reload Staff" button to re-fetch');
console.log('   3. Check browser console for detailed logs');
console.log('   4. Look for "🔍 Querying staff_users" message');
console.log('   5. Check if institution_code is NULL or has value');
