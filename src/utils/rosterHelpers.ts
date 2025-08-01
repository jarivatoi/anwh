export const parseNameChange = (description: string, assignedName: string) => {
  // First, check if we have the original PDF assignment stored in the description
  const originalPdfMatch = description.match(/\(Original PDF: ([^)]+)\)/);
  let originalPdfAssignment = null;
  
  if (originalPdfMatch) {
    originalPdfAssignment = originalPdfMatch[1];
    console.log('🔍 Found original PDF assignment in description:', originalPdfAssignment);
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
      // Use the stored original PDF assignment if available, otherwise use the first "from"
      const originalAssignment = originalPdfAssignment || changes[0].from;
      
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
    // Use the stored original PDF assignment if available, otherwise use the match
    const originalAssignment = originalPdfAssignment || singleMatch[1];
    
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