import React from 'react';
import Groups from '../Groups';

// For now, reuse the existing Groups component
// Later we can add admin-specific features
const AdminGroups: React.FC = () => {
  return <Groups />;
};

export default AdminGroups;