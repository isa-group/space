import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUserPlus, FiTrash2, FiSearch, FiLogOut } from 'react-icons/fi';
import useAuth from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { useCustomAlert } from '@/hooks/useCustomAlert';
import { useCustomConfirm } from '@/hooks/useCustomConfirm';
import { getOrganization, getOrganizations, addMember, removeMember, updateMemberRole, updateOrganization } from '@/api/organizations/organizationsApi';
import type { OrganizationMember } from '@/types/Organization';

export default function MembersPage() {
  const { user } = useAuth();
  const { currentOrganization, setCurrentOrganization, setOrganizations } = useOrganization();
  const { showAlert } = useCustomAlert();
  const { showConfirm, confirmElement } = useCustomConfirm();

  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [owner, setOwner] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMemberUsername, setNewMemberUsername] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'ADMIN' | 'MANAGER' | 'EVALUATOR'>(
    'EVALUATOR'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string>('');

  useEffect(() => {
    if (!currentOrganization?.id) return;
    loadMembers();
  }, [currentOrganization?.id]);

  const loadMembers = async () => {
    if (!currentOrganization || !user?.apiKey) return;

    setLoading(true);
    try {
      const org = await getOrganization(user.apiKey, currentOrganization.id);
      setMembers(org.members || []);
      setOwner(org.owner);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!currentOrganization || !user?.apiKey) {
      setModalError('Organization or user not found');
      return;
    }

    // Validation
    const trimmedUsername = newMemberUsername.trim();
    if (!trimmedUsername) {
      setModalError('Username is required');
      return;
    }

    if (trimmedUsername.length < 2) {
      setModalError('Username must be at least 2 characters');
      return;
    }

    setIsSubmitting(true);
    setModalError('');
    
    try {
      const updatedOrg = await addMember(user.apiKey, currentOrganization.id, {
        username: trimmedUsername,
        role: newMemberRole,
      });
      
      // Update both members and owner from the updated organization
      setMembers(updatedOrg.members || []);
      setOwner(updatedOrg.owner);
      setShowAddModal(false);
      setNewMemberUsername('');
      setNewMemberRole('EVALUATOR');
      setModalError('');
      showAlert('Member added successfully', 'success');
    } catch (error: any) {
      // Extract the error message more intelligently
      let errorMsg = error.message || 'Failed to add member';
      
      // Check if it's a user not found error
      if (errorMsg.includes('does not exist')) {
        errorMsg = 'User not found. Please check the username.';
      } else if (errorMsg.includes('already a member') || errorMsg.includes('addToSet')) {
        errorMsg = 'This user is already a member of the organization.';
      } else if (errorMsg.includes('PERMISSION ERROR')) {
        errorMsg = 'You do not have permission to add members.';
      }
      
      setModalError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (username: string) => {
    if (!currentOrganization || !user?.apiKey) return;

    const confirmed = await showConfirm(
      `Are you sure you want to remove ${username} from the organization?`,
      'danger'
    );

    if (!confirmed) return;

    try {
      const updatedOrg = await removeMember(user.apiKey, currentOrganization.id, username);
      setMembers(updatedOrg.members || []);
      setOwner(updatedOrg.owner);
      showAlert('Member removed successfully', 'success');
    } catch (error: any) {
      showAlert(error.message || 'Failed to remove member', 'danger');
    }
  };

  const handleChangeRole = async (username: string, newRole: 'ADMIN' | 'MANAGER' | 'EVALUATOR') => {
    if (!currentOrganization || !user?.apiKey) return;

    try {
      const updatedOrg = await updateMemberRole(user.apiKey, currentOrganization.id, username, newRole);
      setMembers(updatedOrg.members || []);
      setOwner(updatedOrg.owner);
      showAlert('Member role updated successfully', 'success');
    } catch (error: any) {
      showAlert(error.message || 'Failed to update member role', 'danger');
    }
  };

  const filteredMembers = members.filter(member =>
    member.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Build display list: owner first, then other members
  const displayMembers = owner
    ? [
        { username: owner, role: 'OWNER' as const },
        ...filteredMembers
      ]
    : filteredMembers;

  // Check if current user can remove members
  const isOwner = user?.username === owner;
  const isAdmin = user?.role?.trim().toUpperCase() === 'ADMIN';
  const currentMemberRole = members.find(member => member.username === user?.username)?.role;
  const canRemoveMembers = isOwner || isAdmin;
  const canManageRoles = isAdmin || isOwner || currentMemberRole === 'ADMIN' || currentMemberRole === 'MANAGER';

  const canRemoveMember = (memberUsername: string) => {
    // Owner cannot be removed by anyone
    if (memberUsername === owner) return false;
    // Only owner or admin can remove members
    return canRemoveMembers;
  };

  const canChangeRole = (memberUsername: string, memberRole: OrganizationMember['role'] | 'OWNER') => {
    // Cannot change owner's role
    if (memberUsername === owner) return false;
    if (!canManageRoles) return false;
    if (isAdmin || isOwner || currentMemberRole === 'ADMIN') return true;
    if (currentMemberRole === 'MANAGER') {
      return memberRole === 'MANAGER' || memberRole === 'EVALUATOR';
    }
    return false;
  };

  const getAssignableRoles = (memberRole: OrganizationMember['role']) => {
    if (isAdmin || isOwner || currentMemberRole === 'ADMIN') {
      return ['ADMIN', 'MANAGER', 'EVALUATOR'] as const;
    }
    if (currentMemberRole === 'MANAGER') {
      return ['MANAGER', 'EVALUATOR'] as const;
    }
    return [] as const;
  };

  const getNextOwner = () => {
    const rolePriority: OrganizationMember['role'][] = ['ADMIN', 'MANAGER', 'EVALUATOR'];
    for (const role of rolePriority) {
      const candidate = members.find(member => member.role === role && member.username !== user?.username);
      if (candidate) return candidate.username;
    }
    return '';
  };

  const refreshOrganizations = async () => {
    if (!user?.apiKey) return;
    const orgs = await getOrganizations(user.apiKey);
    setOrganizations(orgs);
    if (orgs.length === 0) {
      setCurrentOrganization(null);
      return;
    }
    const nextOrg = orgs.find(org => org.default) || orgs[0];
    setCurrentOrganization(nextOrg);
  };

  const handleLeaveOrganization = async () => {
    if (!currentOrganization || !user?.apiKey || !user?.username) return;

    const confirmed = await showConfirm(
      'Are you sure you want to leave this organization?',
      'danger'
    );

    if (!confirmed) return;

    try {
      if (isOwner) {
        const nextOwner = getNextOwner();
        if (!nextOwner) {
          showAlert('You must transfer ownership before leaving.', 'danger');
          return;
        }

        const transferConfirmed = await showConfirm(
          `Ownership will be transferred to ${nextOwner} before you leave. Continue?`,
          'danger'
        );

        if (!transferConfirmed) return;

        const transferredOrg = await updateOrganization(user.apiKey, currentOrganization.id, {
          owner: nextOwner,
        });
        setMembers(transferredOrg.members || []);
        setOwner(transferredOrg.owner);
      }

      const updatedOrg = await removeMember(user.apiKey, currentOrganization.id, user.username);
      setMembers(updatedOrg.members || []);
      setOwner(updatedOrg.owner);
      await refreshOrganizations();
      showAlert('You left the organization successfully.', 'success');
    } catch (error: any) {
      showAlert(error.message || 'Failed to leave organization', 'danger');
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'ADMIN':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'MANAGER':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'EVALUATOR':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500 dark:text-gray-400">Loading members...</div>
      </div>
    );
  }

  if (!currentOrganization) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500 dark:text-gray-400">Please select an organization</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Organization Members
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage members and their roles in {currentOrganization.name}
        </p>
      </motion.div>

      {/* Owner Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-indigo-900 dark:text-indigo-300">Owner:</span>
          <span className="text-sm text-indigo-700 dark:text-indigo-400">{owner}</span>
          <span className="ml-auto px-2 py-1 text-xs font-medium bg-indigo-200 text-indigo-900 dark:bg-indigo-800 dark:text-indigo-100 rounded">
            Full Control
          </span>
        </div>
      </motion.div>

      {/* Search and Add Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex gap-4 mb-6"
      >
        <div className="flex-1 relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search members..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <button
          onClick={() => {
            setShowAddModal(true);
            setNewMemberUsername('');
            setNewMemberRole('EVALUATOR');
            setModalError('');
          }}
          className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
        >
          <FiUserPlus size={20} />
          <span>Add Member</span>
        </button>
      </motion.div>

      {/* Members List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden"
      >
        {displayMembers.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            {searchTerm ? 'No members found matching your search' : 'No members yet'}
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {displayMembers.map((member, index) => (
              <motion.div
                key={member.username}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                      <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                        {member.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {member.username}
                      </div>
                      {canChangeRole(member.username, member.role) && member.role !== 'OWNER' ? (
                        <select
                          value={member.role}
                          onChange={(e) => handleChangeRole(member.username, e.target.value as 'ADMIN' | 'MANAGER' | 'EVALUATOR')}
                          className={`cursor-pointer px-2 py-1 text-xs font-medium rounded mt-1 border-0 focus:ring-2 focus:ring-indigo-500 ${getRoleBadgeColor(member.role)}`}
                        >
                          {getAssignableRoles(member.role).map(role => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                        </select>
                      ) : (
                        <div
                          className={`inline-block px-2 py-1 text-xs font-medium rounded mt-1 ${getRoleBadgeColor(member.role)}`}
                        >
                          {member.role}
                        </div>
                      )}
                    </div>
                  </div>
                  {member.username === user?.username ? (
                    <button
                      onClick={handleLeaveOrganization}
                      className="cursor-pointer p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Leave organization"
                    >
                      <FiLogOut size={18} />
                    </button>
                  ) : canRemoveMember(member.username) ? (
                    <button
                      onClick={() => handleRemoveMember(member.username)}
                      className="cursor-pointer p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Remove member"
                    >
                      <FiTrash2 size={18} />
                    </button>
                  ) : (
                    <div className="p-2 text-gray-300 dark:text-gray-600" title="Cannot remove this member">
                      <FiTrash2 size={18} />
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Add Member Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => {
                setShowAddModal(false);
                setModalError('');
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  Add Member
                </h2>
                {modalError && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-700 dark:text-red-300">{modalError}</p>
                  </div>
                )}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      value={newMemberUsername}
                      onChange={e => {
                        setNewMemberUsername(e.target.value);
                        setModalError('');
                      }}
                      placeholder="e.g. john_doe"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      autoComplete="off"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Role
                    </label>
                    <select
                      value={newMemberRole}
                      onChange={e =>
                        setNewMemberRole(e.target.value as 'ADMIN' | 'MANAGER' | 'EVALUATOR')
                      }
                      className="cursor-pointer w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="EVALUATOR">Evaluator</option>
                      <option value="MANAGER">Manager</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setNewMemberUsername('');
                      setNewMemberRole('EVALUATOR');
                      setModalError('');
                    }}
                    className="cursor-pointer flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddMember}
                    disabled={isSubmitting || !newMemberUsername}
                    className="cursor-pointer flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Adding...' : 'Add Member'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      
      {/* Confirm Dialog */}
      {confirmElement}
    </div>
  );
}
