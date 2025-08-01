export const parseNameChange = (description: string, assignedName: string) => {
  // Look for the FIRST "Name changed from" pattern to get the original assignment
  // This ensures we always show the original PDF assignment, not intermediate changes
  const allMatches = description.match(/Name changed from "([^"]+)" to "([^"]+)"/g);
  
  if (allMatches && allMatches.length > 0) {
    // Always use the FIRST match to get the original assignment
    const firstMatch = allMatches[0].match(/Name changed from "([^"]+)" to "([^"]+)"/);
    if (firstMatch) {
      return {
        oldName: firstMatch[1], // Original PDF assignment (the "from" name)
        newName: firstMatch[2], // What it was changed to (the "to" name)
        isNameChange: true
      };
    }
  }
  
  // Fallback: look for any single match (for backward compatibility)
  const singleMatch = description.match(/Name changed from "([^"]+)" to "([^"]+)"/);
  if (singleMatch) {
    return {
      oldName: singleMatch[1],
      newName: singleMatch[2], // Use the "to" value from description
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