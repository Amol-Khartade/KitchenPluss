import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  UserPlus,
  Shield,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Mail,
  Key,
  User as UserIcon,
  Crown,
  ChefHat,
  Sparkles,
} from 'lucide-react';
import { usersApi } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { User } from '../types/index.js';

const AVAILABLE_ROLES = [
  'Owner',
  'Admin',
  'Executive Chef',
  'Sous Chef',
  'Line Cook',
  'Station Lead',
  'Kitchen Manager',
  'Server / Front of House',
] as const;

export const UserManagementView: React.FC = () => {
  const { user: currentUser, organization, isOwner } = useAuth();
  const queryClient = useQueryClient();

  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<string>('Line Cook');
  const [password, setPassword] = useState('password123');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ---------------------------------------------------------------- //
  // Queries & Mutations
  // ---------------------------------------------------------------- //
  const { data, isLoading, error } = useQuery({
    queryKey: ['org-users'],
    queryFn: () => usersApi.getAll(),
  });

  const users = data?.users || [];

  const createUserMutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['org-users'] });
      setIsAddUserOpen(false);
      setName('');
      setEmail('');
      setPassword('password123');
      setSuccessMessage(`Added ${res.user.name} (${res.user.email}) to ${organization?.name}!`);
      setTimeout(() => setSuccessMessage(null), 4000);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to add user');
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => usersApi.updateRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-users'] });
      setSuccessMessage('User role updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to update role');
      setTimeout(() => setErrorMessage(null), 4000);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: usersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-users'] });
      setSuccessMessage('User removed from organization');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to remove user');
      setTimeout(() => setErrorMessage(null), 4000);
    },
  });

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    createUserMutation.mutate({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role,
      password: password || 'password123',
    });
  };

  const getRoleBadgeStyle = (userRole: string) => {
    switch (userRole) {
      case 'Owner':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40 ring-1 ring-amber-500/30';
      case 'Admin':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
      case 'Executive Chef':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'Sous Chef':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
      default:
        return 'bg-slate-700/50 text-slate-300 border-slate-600/50';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-bg-surface p-6 rounded-2xl border border-bg-border shadow-xl">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-sky-600 via-indigo-600 to-amber-500 p-0.5 flex items-center justify-center shadow-lg shadow-sky-950/50">
            <div className="w-full h-full bg-bg-surface rounded-[10px] flex items-center justify-center">
              <Users className="w-6 h-6 text-sky-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h2 className="text-xl font-bold text-white tracking-tight">Team & User Management</h2>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-sky-950 text-sky-400 border border-sky-800">
                {organization?.name || 'Client Ops'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Admin & Owner control console for kitchen staff, privileges, and operational assignments.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsAddUserOpen(!isAddUserOpen);
            setErrorMessage(null);
          }}
          className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-sky-900/40 hover:shadow-sky-800/60 transition-all active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          <span>{isAddUserOpen ? 'Cancel' : 'Add Team Member'}</span>
        </button>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="flex items-center space-x-2 p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded-xl text-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="flex items-center space-x-2 p-3 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl text-xs animate-in fade-in">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Add User Expandable Drawer/Form */}
      {isAddUserOpen && (
        <div className="bg-bg-surface border border-sky-500/40 rounded-2xl p-6 shadow-2xl animate-in slide-in-from-top-4 duration-200">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-bg-border">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-bold text-white">Add New Team Member to {organization?.name}</h3>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Org Code: {organization?.code}</span>
          </div>

          <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Gordon Ramsay"
                  className="w-full bg-bg-card border border-bg-border focus:border-sky-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="gordon@kitchenpulse.io"
                  className="w-full bg-bg-card border border-bg-border focus:border-sky-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Kitchen Role
              </label>
              <div className="relative">
                <ChefHat className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-bg-card border border-bg-border focus:border-sky-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
                >
                  {AVAILABLE_ROLES.map((r) => {
                    // Non-owners cannot create Owner
                    if (r === 'Owner' && !isOwner) return null;
                    return (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Temporary Password
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="password123"
                  className="w-full bg-bg-card border border-bg-border focus:border-sky-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
                />
              </div>
            </div>

            <div className="md:col-span-4 flex justify-end space-x-3 mt-2">
              <button
                type="button"
                onClick={() => setIsAddUserOpen(false)}
                className="px-4 py-2 bg-bg-card hover:bg-bg-hover text-slate-300 text-xs font-semibold rounded-xl border border-bg-border transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createUserMutation.isPending}
                className="flex items-center space-x-2 px-5 py-2 bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold rounded-xl shadow-lg shadow-sky-900/40 transition-all disabled:opacity-50"
              >
                {createUserMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Create User</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-bg-surface border border-bg-border rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-bg-border flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Active Organization Members ({users.length})
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Isolated tenant: {organization?.slug}
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
            <span className="text-xs text-slate-400 font-mono">Loading team members...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-400 text-xs">
            Failed to load users: {(error as Error).message}
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No team members registered yet in this organization.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-bg-card text-slate-400 uppercase text-[10px] tracking-wider font-semibold border-b border-bg-border">
                <tr>
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Auth Type</th>
                  <th className="py-3 px-4">Role Assignment</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bg-border">
                {users.map((u: User) => {
                  const isCurrent = u.id === currentUser?.id;
                  const isUserOwner = u.role === 'Owner';
                  const isUserAdmin = u.role === 'Admin';

                  return (
                    <tr key={u.id} className="hover:bg-bg-card/50 transition-colors">
                      {/* Member Info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          {u.avatar_url ? (
                            <img
                              src={u.avatar_url}
                              alt={u.name}
                              className="w-8 h-8 rounded-lg object-cover ring-1 ring-sky-500/40"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shadow-sm">
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <span className="font-semibold text-white">{u.name}</span>
                              {isCurrent && (
                                <span className="text-[9px] px-1.5 py-0.2 bg-sky-950 text-sky-400 border border-sky-800 rounded">
                                  You
                                </span>
                              )}
                              {isUserOwner && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono">{u.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* Current Role Badge */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold border uppercase tracking-wider ${getRoleBadgeStyle(
                            u.role
                          )}`}
                        >
                          {u.role}
                        </span>
                      </td>

                      {/* Auth Type */}
                      <td className="py-3 px-4">
                        <span className="text-[11px] text-slate-300 font-mono capitalize">
                          {u.auth_provider === 'google' ? 'Google Auth' : 'Email & Password'}
                        </span>
                      </td>

                      {/* Role Modifier Dropdown */}
                      <td className="py-3 px-4">
                        {isOwner && !isCurrent ? (
                          <select
                            value={u.role}
                            onChange={(e) => updateRoleMutation.mutate({ id: u.id, role: e.target.value })}
                            className="bg-bg-card border border-bg-border focus:border-sky-500 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
                          >
                            {AVAILABLE_ROLES.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        ) : !isOwner && isUserAdmin ? (
                          <span className="text-slate-500 text-[11px]">Protected Admin</span>
                        ) : !isOwner && !isUserOwner && !isCurrent ? (
                          <select
                            value={u.role}
                            onChange={(e) => updateRoleMutation.mutate({ id: u.id, role: e.target.value })}
                            className="bg-bg-card border border-bg-border focus:border-sky-500 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
                          >
                            {AVAILABLE_ROLES.filter((r) => r !== 'Owner' && r !== 'Admin').map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-slate-500 text-[11px] italic">Fixed (Owner)</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        {!isCurrent && !isUserOwner && (isOwner || !isUserAdmin) ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Are you sure you want to remove ${u.name} (${u.email}) from ${organization?.name}?`)) {
                                deleteUserMutation.mutate(u.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors"
                            title="Remove User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
export default UserManagementView;
