import { useContext } from 'react';
import { NDKContext } from '../contexts/NDKContext';

export const useNDK = () => {
  const context = useContext(NDKContext);
  if (!context) {
    throw new Error('useNDK must be used within an NDKProvider');
  }
  return context;
}; 