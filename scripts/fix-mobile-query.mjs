import fs from 'fs';

const filePath = 'c:/Users/subit/Downloads/anwh/src/components/RosterMobilePlanner.tsx';
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔧 Fixing staff_users query in RosterMobilePlanner...\n');

// Fix the fetchStaffList function to use correct column names
const oldQuery = `      const { data, error } = await supabase
        .from('staff_users')
        .select('id, display_name')
        .eq('institution_code', institutionCode)
        .order('display_name', { ascending: true });

      if (error) throw error;
      setStaffList(data || []);`;

const newQuery = `      const { data, error } = await supabase
        .from('staff_users')
        .select('id, roster_display_name, surname, name')
        .eq('institution_code', institutionCode)
        .order('surname', { ascending: true });

      if (error) throw error;
      
      // Map to use roster_display_name or construct from surname/name
      const mappedData = (data || []).map(staff => ({
        id: staff.id,
        display_name: staff.roster_display_name || \`\${staff.surname}, \${staff.name}\`
      }));
      
      setStaffList(mappedData);`;

if (content.includes(oldQuery)) {
  content = content.replace(oldQuery, newQuery);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Fixed staff_users query to use roster_display_name, surname, name');
  console.log('✅ Added mapping to construct display_name correctly');
} else {
  console.log('❌ Could not find exact query pattern');
  console.log('Searching for alternative patterns...');
  
  // Try simpler replacement
  if (content.includes(".select('id, display_name')")) {
    content = content.replace(
      ".select('id, display_name')",
      ".select('id, roster_display_name, surname, name')"
    );
    content = content.replace(
      ".order('display_name', { ascending: true })",
      ".order('surname', { ascending: true })"
    );
    
    // Add mapping after setStaffList
    content = content.replace(
      "setStaffList(data || []);",
      `// Map to use roster_display_name or construct from surname/name
      const mappedData = (data || []).map(staff => ({
        id: staff.id,
        display_name: staff.roster_display_name || \`\${staff.surname}, \${staff.name}\`
      }));
      
      setStaffList(mappedData);`
    );
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Fixed with alternative approach');
  } else {
    console.log('❌ Could not fix automatically');
  }
}

console.log('\n✨ RosterMobilePlanner query fixed!');
