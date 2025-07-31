export const parseNameChange = (description: string, assignedName: string) => {
  // Look for pattern: Name changed from "oldName" to "newName"
  const match = description.match(/Name changed from "([^"]+)" to "([^"]+)"/);
  if (match) {
    return {
      oldName: match[1],
      newName: match[2],
      isNameChange: true
    };
  }
  return {
    oldName: null,
    newName: assignedName,
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