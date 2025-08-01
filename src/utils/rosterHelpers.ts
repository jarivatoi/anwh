export const parseNameChange = (description: string, assignedName: string) => {
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
      // The ORIGINAL assignment is the "from" of the FIRST change
      const originalAssignment = changes[0].from;
      
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
    return {
      oldName: singleMatch[1], // Original assignment
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