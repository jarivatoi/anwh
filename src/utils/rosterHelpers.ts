export const parseNameChange = (description: string, assignedName: string) => {
  // First, check if we have the original PDF assignment stored in the description
  const originalPdfMatch = description.match(/\(Original PDF: ([^)]+)\)/);
  
  if (originalPdfMatch) {
    let originalPdfAssignment = originalPdfMatch[1].trim();
    
    // Fix missing closing parenthesis if it exists
    if (originalPdfAssignment.includes('(R') && !originalPdfAssignment.includes('(R)')) {
      originalPdfAssignment = originalPdfAssignment.replace('(R', '(R)');
    }
    
    console.log('🔍 Found original PDF assignment in description:', originalPdfAssignment);
    
    // If we have the original PDF assignment stored, use it directly
    return {
      oldName: originalPdfAssignment, // Always the original PDF assignment
      newName: assignedName, // Current assignment
      isNameChange: true
    };
  }
  
  // Look for ALL "Name changed from" patterns to trace back to the original
  const allMatches = description.match(/Name changed from "([^"]+)" to "([^"]+)"/g);
  
  if (allMatches && allMatches.length > 0) {
    console.log('🔍 Found multiple name changes:', allMatches);
    
    // Parse all matches to build the chain
    const changes = allMatches.map(match => {
      const parsed = match.match(/Name changed from "([^"]+)" to "([^"]+)"/);
      return parsed ? { from: parsed[1], to: parsed[2] } : null;
    }).filter(Boolean);
    
    console.log('🔍 Parsed changes:', changes);
    
    if (changes.length > 0) {
      // Use the first "from" as the original assignment (this is the original PDF assignment)
      let originalAssignment = changes[0].from;
      
      // Fix missing closing parenthesis if it exists
      if (originalAssignment.includes('(R') && !originalAssignment.includes('(R)')) {
        originalAssignment = originalAssignment.replace('(R', '(R)');
      }
      
      // The CURRENT assignment should be the assignedName parameter
      console.log('🔍 Original assignment:', originalAssignment);
      console.log('🔍 Current assignment:', assignedName);
      
      return {
        oldName: originalAssignment, // Always the original PDF assignment
        newName: assignedName, // Current assignment
        isNameChange: true
      };
    }
  }
  
  // Fallback: look for single match (for backward compatibility)
  const singleMatch = description.match(/Name changed from "([^"]+)" to "([^"]+)"/);
  if (singleMatch) {
    // Use the match as the original assignment
    let originalAssignment = singleMatch[1];
    
    // Fix missing closing parenthesis if it exists
    if (originalAssignment.includes('(R') && !originalAssignment.includes('(R)')) {
      originalAssignment = originalAssignment.replace('(R', '(R)');
    }
    
    return {
      oldName: originalAssignment, // Original PDF assignment
      newName: assignedName, // Current assignment (not from description)
      isNameChange: true
    };
  }
  
  return {
    oldName: null,
    newName: null,
    isNameChange: false
  };
};

export const isPastDate = (dateString: string): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const entryDate = new Date(dateString);
  entryDate.setHours(0, 0, 0, 0);
  
  return entryDate < today;
};