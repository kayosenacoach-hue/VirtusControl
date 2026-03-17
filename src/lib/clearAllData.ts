// Clear all app data from storage
export const clearAllData = async () => {
  const keys = [
    'financial-expenses',
    'financial-entities',
    'financial-recurring-accounts',
    'financial-monthly-bills',
    'selected-entity-id',
  ];

  // Clear from window.storage if available
  if (typeof window !== 'undefined' && (window as any).storage) {
    for (const key of keys) {
      try {
        await (window as any).storage.set(key, JSON.stringify(key.includes('entity-id') ? null : []));
      } catch (e) {
        console.error(`Error clearing ${key}:`, e);
      }
    }
  }
  
  // Also clear from localStorage as fallback
  for (const key of keys) {
    localStorage.removeItem(key);
  }
};
