import { useEffect, useRef, useState, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/layouts/AdminLayout';
import Modal from '@/components/admin/Modal';
import FormInput from '@/components/admin/FormInput';
import { FaPlus, FaSearch } from 'react-icons/fa';
import apiClient, { users as usersAPI } from '@/services/api';
import PhoneInput, { validateBDPhone } from '@/components/PhoneInput';

export default function AdminUsers() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<any[]>([]);
  const [teamLeaders, setTeamLeaders] = useState<any[]>([]);

  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [bulkAction, setBulkAction] = useState<string>('');
  const [bulkWorking, setBulkWorking] = useState(false);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [teamLeaderFilter, setTeamLeaderFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    roleId: '',
    teamLeaderId: '',
    status: 'active',
  });

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }

    loadUsers();
    loadRoles();
    loadTeamLeaders();
  }, [router]);

  // Keep selection valid if the list changes (e.g., after deactivate)
  useEffect(() => {
    if (!users.length) {
      if (selectedUserIds.length) setSelectedUserIds([]);
      return;
    }
    const userIdSet = new Set(users.map(u => Number(u.id)));
    setSelectedUserIds(prev => prev.filter(id => userIdSet.has(id)));
  }, [users]);

  const loadUsers = async () => {
    try {
      const data = await usersAPI.list();
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const response = await apiClient.get('/rbac/roles');
      setRoles(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to load roles:', error);
      setRoles([]);
    }
  };

  const loadTeamLeaders = async () => {
    try {
      const response = await apiClient.get('/users');
      const data = Array.isArray(response.data) ? response.data : [];
      const leaderRole = roles.find((r: any) => r.slug === 'sales-team-leader');
      const leaderRoleId = leaderRole ? leaderRole.id : null;
      const leaders = leaderRoleId
        ? data.filter((u: any) => u.roleId === leaderRoleId)
        : data;
      setTeamLeaders(leaders);
    } catch (error) {
      console.error('Failed to load team leaders:', error);
      setTeamLeaders([]);
    }
  };

  const handleAdd = () => {
    setModalMode('add');
    setSelectedUser(null);
    setFormData({
      name: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      roleId: '',
      teamLeaderId: '',
      status: 'active',
    });
    setIsModalOpen(true);
  };

  const handleEdit = (user: any) => {
    setModalMode('edit');
    setSelectedUser(user);
    setFormData({
      name: user.name || '',
      lastName: user.lastName || '',
      email: user.email || '',
      phone: user.phone || '',
      password: '',
      roleId: user.roleId ? String(user.roleId) : '',
      teamLeaderId: user.teamLeaderId ? String(user.teamLeaderId) : '',
      status: user.status || 'active',
    });
    setIsModalOpen(true);
  };

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Validate phone if provided
    if (formData.phone && !validateBDPhone(formData.phone)) {
      alert('Please enter a valid 10-digit phone number');
      return;
    }

    try {
      const payload: any = {
        name: formData.name,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone || null,
        roleId: formData.roleId ? Number(formData.roleId) : null,
        teamLeaderId: formData.teamLeaderId ? Number(formData.teamLeaderId) : null,
        status: formData.status,
      };

      if (modalMode === 'add') {
        if (!formData.password) {
          alert('Password is required for new user');
          return;
        }
        payload.password = formData.password;
        const created = await usersAPI.create(payload);
        setUsers((prev) => [...prev, created]);
        alert('User added successfully');
      } else if (modalMode === 'edit' && selectedUser) {
        if (formData.password) {
          payload.password = formData.password;
        }
        const updated = await usersAPI.update(selectedUser.id, payload);
        setUsers((prev) => prev.map((u) => (u.id === selectedUser.id ? updated : u)));
        alert('User updated successfully');
      }

      setIsModalOpen(false);
      loadUsers();
    } catch (error) {
      console.error('Failed to save user:', error);
      alert('Operation failed');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to deactivate this user?')) return;

    try {
      await usersAPI.delete(id);
      setUsers(users.filter(u => u.id !== id));
      setSelectedUserIds(prev => prev.filter(x => x !== id));
    } catch (error) {
      alert('Failed to deactivate user');
    }
  };

  const getRoleName = (roleId: number | null | undefined) => {
    if (!roleId) return 'User';
    const role = roles.find((r: any) => r.id === roleId);
    return role ? role.name : 'User';
  };

  const filteredUsers = users.filter((user) => {
    const fullName = `${user.name || ''} ${user.lastName || ''}`.toLowerCase();
    const searchMatch =
      fullName.includes(search.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(search.toLowerCase());

    const roleMatch = roleFilter ? String(user.roleId) === roleFilter : true;
    const statusMatch = statusFilter ? user.status === statusFilter : true;
    const teamLeaderMatch = teamLeaderFilter
      ? String(user.teamLeaderId || '') === teamLeaderFilter
      : true;

    return searchMatch && roleMatch && statusMatch && teamLeaderMatch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const pageUserIds = paginatedUsers.map(u => Number(u.id));
  const allPageSelected = pageUserIds.length > 0 && pageUserIds.every(id => selectedUserIds.includes(id));
  const somePageSelected = pageUserIds.some(id => selectedUserIds.includes(id));
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = somePageSelected && !allPageSelected;
    }
  }, [somePageSelected, allPageSelected]);

  const toggleUserSelection = (id: number) => {
    setSelectedUserIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const toggleSelectAllOnPage = () => {
    if (allPageSelected) {
      // Unselect only users on this page
      setSelectedUserIds(prev => prev.filter(id => !pageUserIds.includes(id)));
    } else {
      // Add users from this page
      setSelectedUserIds(prev => Array.from(new Set([...prev, ...pageUserIds])));
    }
  };

  const clearSelection = () => setSelectedUserIds([]);

  const handleBulkApply = async () => {
    if (!bulkAction) return;
    if (selectedUserIds.length === 0) {
      alert('Please select at least one user');
      return;
    }

    const actionLabel =
      bulkAction === 'deactivate'
        ? 'deactivate'
        : bulkAction === 'activate'
          ? 'activate'
          : bulkAction === 'inactive'
            ? 'mark inactive'
            : 'suspend';

    if (!confirm(`Are you sure you want to ${actionLabel} ${selectedUserIds.length} selected user(s)?`)) return;

    setBulkWorking(true);
    try {
      const results = await Promise.allSettled(
        selectedUserIds.map((id) => {
          if (bulkAction === 'deactivate') return usersAPI.delete(id);
          if (bulkAction === 'activate') return usersAPI.update(id, { status: 'active' });
          if (bulkAction === 'inactive') return usersAPI.update(id, { status: 'inactive' });
          return usersAPI.update(id, { status: 'suspended' });
        }),
      );

      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.length - succeeded;

      await loadUsers();
      clearSelection();
      setBulkAction('');

      if (failed > 0) {
        alert(`Bulk action completed: ${succeeded} succeeded, ${failed} failed.`);
      }
    } catch (error) {
      console.error('Bulk action failed:', error);
      alert('Bulk action failed');
    } finally {
      setBulkWorking(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Users</h1>
            <p className="text-gray-600 mt-1">Manage system users and roles</p>
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            <FaPlus />
            Add New User
          </button>
        </div>

        <div className="mb-4 bg-white rounded-lg shadow p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="w-full md:w-1/3 relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-wrap gap-4 w-full md:w-auto">
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">All Roles</option>
              {roles.map((role: any) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>

            {/* When viewing telesales agents, allow filter by Team Leader */}
            <select
              value={teamLeaderFilter}
              onChange={(e) => {
                setTeamLeaderFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">All Team Leaders</option>
              {teamLeaders.map((leader: any) => (
                <option key={leader.id} value={leader.id}>
                  {leader.name} {leader.lastName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!loading && users.length > 0 && (
          <div className="mb-4 bg-white rounded-lg shadow p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                disabled={bulkWorking}
              >
                <option value="">Bulk Actions</option>
                <option value="deactivate">Deactivate (Delete)</option>
                <option value="activate">Set Active</option>
                <option value="inactive">Set Inactive</option>
                <option value="suspend">Set Suspended</option>
              </select>

              <button
                onClick={handleBulkApply}
                disabled={!bulkAction || selectedUserIds.length === 0 || bulkWorking}
                className={`px-4 py-2 rounded-lg text-sm text-white ${
                  !bulkAction || selectedUserIds.length === 0 || bulkWorking
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {bulkWorking ? 'Applying…' : 'Apply'}
              </button>
            </div>

            <div className="flex items-center gap-3 text-sm text-gray-700">
              <span>
                Selected <span className="font-semibold">{selectedUserIds.length}</span>
              </span>
              <button
                onClick={clearSelection}
                disabled={selectedUserIds.length === 0 || bulkWorking}
                className={`px-3 py-2 rounded-lg border text-sm ${
                  selectedUserIds.length === 0 || bulkWorking
                    ? 'text-gray-400 border-gray-200 cursor-not-allowed'
                    : 'text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Clear
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-600">Loading...</div>
          ) : paginatedUsers.length === 0 ? (
            <div className="p-8 text-center text-gray-600">No users yet.</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={toggleSelectAllOnPage}
                      className="h-4 w-4"
                      aria-label="Select all users on this page"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(Number(user.id))}
                        onChange={() => toggleUserSelection(Number(user.id))}
                        className="h-4 w-4"
                        aria-label={`Select user ${user.id}`}
                      />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{user.id}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {user.name} {user.lastName}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{user.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{getRoleName(user.roleId)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.status === 'active' ? 'Active' : user.status === 'inactive' ? 'Inactive' : 'Suspended'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(user)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Deactivate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!loading && filteredUsers.length > 0 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {(currentPage - 1) * itemsPerPage + 1} -
              {' '}
              {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length} users
            </p>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className={`px-3 py-1 rounded border text-sm ${
                  currentPage === 1
                    ? 'text-gray-400 border-gray-200 cursor-not-allowed'
                    : 'text-gray-700 border-gray-300 hover:bg-gray-100'
                }`}
              >
                Previous
              </button>
              <span className="text-sm text-gray-600 px-2 py-1">
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className={`px-3 py-1 rounded border text-sm ${
                  currentPage === totalPages
                    ? 'text-gray-400 border-gray-200 cursor-not-allowed'
                    : 'text-gray-700 border-gray-300 hover:bg-gray-100'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Add/Edit User Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={modalMode === 'add' ? 'Add New User' : 'Edit User'}
          size="lg"
          footer={
            <>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="user-form"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {modalMode === 'add' ? 'Create' : 'Update'}
              </button>
            </>
          }
        >
          <form id="user-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="First Name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
              <FormInput
                label="Last Name"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <PhoneInput
                  name="phone"
                  value={formData.phone}
                  onChange={(value) => setFormData({ ...formData, phone: value })}
                  placeholder="01712345678"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  name="roleId"
                  value={formData.roleId}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Role</option>
                  {roles.map((role: any) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Team Leader (for Sales Executive)</label>
                <select
                  name="teamLeaderId"
                  value={formData.teamLeaderId}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No Team Leader</option>
                  {teamLeaders.map((leader: any) => (
                    <option key={leader.id} value={leader.id}>
                      {leader.name} {leader.lastName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label={modalMode === 'add' ? 'Password' : 'Password (leave blank to keep unchanged)'}
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                required={modalMode === 'add'}
              />
            </div>
          </form>
        </Modal>
      </div>
    </AdminLayout>
  );
}
