// UsersPage.jsx — the ONLY file with imports. Components contain all the logic.
import { useState, useEffect, useMemo } from 'react';
import { createUsersTable } from '../components/users/UsersTable';
import { createUserFormModal } from '../components/users/UserFormModal';
import { createDeleteUserModal } from '../components/users/DeleteUserModal';
import { createUsersManager } from '../components/users/UsersManager';
import '../components/users/users.css';

const hooks = { useState, useEffect, useMemo };

const UsersTable = createUsersTable(hooks);
const UserFormModal = createUserFormModal(hooks);
const DeleteUserModal = createDeleteUserModal();
const UsersManager = createUsersManager(hooks, { UsersTable, UserFormModal, DeleteUserModal });

export default function UsersPage() {
  return <UsersManager />;
}