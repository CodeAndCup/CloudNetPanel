import React from 'react';
import Users from '../Users';

// For now, reuse the existing Users component
// Later we can add admin-specific features
const AdminUsers: React.FC = () => {
  return <Users />;
};

export default AdminUsers;