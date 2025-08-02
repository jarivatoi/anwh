export const parseNameChange = (description: string, assignedName: string) => {
  // First, check if we have the original PDF assignment stored in the description
  const originalPdfMatch = description.match(/\(Original PDF: ([^)]+)\)/);
  
  if (originalPdfMatch) {
    let originalPdfAssignment = originalPdfMatch[1].trim();
    
    // Fix missing closing parenthesis if it exists
    if (originalPdfAssignment.includes('(R') && !originalPdfAssignment.includes('(R)')) {
      originalPdfAssignment = originalPdfAssignment.replace('(R', '(R)');
    }
    
    // If we have the original PDF assignment stored, use it directly
    return {
      oldName: originalPdfAssignment, // Always the original PDF assignment
      newName: assignedName, // Current assignment
      isNameChange: true
    };
  }
  
  // Look for the MOST RECENT "Name changed from" pattern to get the immediate change
  const nameChangeMatches = description.match(/Name changed from "([^"]+)" to "([^"]+)"/g);
  
  if (nameChangeMatches && nameChangeMatches.length > 0) {
    // Get the LAST (most recent) change to show the immediate before/after
    const lastMatch = nameChangeMatches[nameChangeMatches.length - 1];
    const parsed = lastMatch.match(/Name changed from "([^"]+)" to "([^"]+)"/);
    
    if (parsed) {
      let fromName = parsed[1].trim();
      let toName = parsed[2].trim();
      
      // Fix missing closing parenthesis if it exists
      if (fromName.includes('(R') && !fromName.includes('(R)')) {
        fromName = fromName.replace('(R', '(R)');
      }
      if (toName.includes('(R') && !toName.includes('(R)')) {
        toName = toName.replace('(R', '(R)');
      }
      
      return {
        oldName: fromName, // The "from" name in the change description
        newName: toName, // The "to" name in the change description (should match assignedName)
        isNameChange: true
      };
    }
    
    // Fallback: Parse all matches to build the chain (for complex cases)
    const changes = nameChangeMatches.map(match => {
      const parsed = match.match(/Name changed from "([^"]+)" to "([^"]+)"/);
      return parsed ? { from: parsed[1], to: parsed[2] } : null;
    }).filter(Boolean);
    
    if (changes.length > 0) {
      // Use the first "from" as the original assignment (original PDF assignment)
      let originalAssignment = changes[0].from;
      
      // Fix missing closing parenthesis if it exists
      if (originalAssignment.includes('(R') && !originalAssignment.includes('(R)')) {
        originalAssignment = originalAssignment.replace('(R', '(R)');
      }
      
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
    let fromName = singleMatch[1].trim();
    let toName = singleMatch[2].trim();
    
    // Fix missing closing parenthesis if it exists
    if (fromName.includes('(R') && !fromName.includes('(R)')) {
      fromName = fromName.replace('(R', '(R)');
    }
    if (toName.includes('(R') && !toName.includes('(R)')) {
      toName = toName.replace('(R', '(R)');
    }
    
    return {
      oldName: fromName, // The "from" name
      newName: toName, // The "to" name
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