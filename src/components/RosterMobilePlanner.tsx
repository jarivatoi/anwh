import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const filePath = join(__dirname, '..', 'src', 'components', 'RosterMobilePlanner.tsx');

console.log('🧹 Removing console.log statements from RosterMobilePlanner.tsx...');

try {
  let content = readFileSync(filePath, 'utf-8');
  
  // Count console logs before removal
  const consoleLogRegex = /console\.log\([^)]*\);?\n?/g;
  const matches = content.match(consoleLogRegex);
  const count = matches ? matches.length : 0;
  
  console.log(`📊 Found ${count} console.log statements`);
  
  // Remove all console.log statements
  content = content.replace(consoleLogRegex, '');
  
  // Also remove console.warn and console.error if needed (commented out for safety)
  // content = content.replace(/console\.warn\([^)]*\);?\n?/g, '');
  // content = content.replace(/console\.error\([^)]*\);?\n?/g, '');
  
  // Write back to file
  writeFileSync(filePath, content, 'utf-8');
  
  console.log('✅ Successfully removed all console.log statements!');
  console.log(`📁 File: ${filePath}`);
} catch (error) {
  console.error('❌ Error processing file:', error.message);
  process.exit(1);
}
