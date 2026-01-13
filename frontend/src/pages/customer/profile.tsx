import { useEffect, useState } from 'react';
import CustomerLayout from '@/layouts/CustomerLayout';
import { auth, customers, cdm } from '@/services/api';
import { FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaUsers, FaEdit, FaTrash, FaSave, FaTimes, FaUserPlus } from 'react-icons/fa';

interface CustomerProfile {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

type FamilyRelationship = 'spouse' | 'child' | 'parent' | 'sibling' | 'grandparent' | 'other';

const toDateInputValue = (value: any): string => {
  if (!value) return '';
  if (typeof value === 'string') {
    // Accept already-normalized YYYY-MM-DD.
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
    return '';
  }
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
};

const isValidIsoDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.toISOString().slice(0, 10) === value;
};

const normalizeOptionalIsoDate = (label: string, value: string): string | undefined => {
  const trimmed = (value || '').trim();
  if (!trimmed) return undefined;
  if (!isValidIsoDate(trimmed)) {
    throw new Error(`${label} must be in YYYY-MM-DD format`);
  }
  return trimmed;
};

export default function CustomerProfilePage() {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  const [family, setFamily] = useState<any[]>([]);
  const [isLoadingFamily, setIsLoadingFamily] = useState(false);
  const [familyError, setFamilyError] = useState<string | null>(null);
  const [newFamilyName, setNewFamilyName] = useState('');
  const [newFamilyPhone, setNewFamilyPhone] = useState('');
  const [newFamilyRelationship, setNewFamilyRelationship] = useState('');
  const [newFamilyDob, setNewFamilyDob] = useState('');
  const [newFamilyAnniversary, setNewFamilyAnniversary] = useState('');
  const [isAddingFamily, setIsAddingFamily] = useState(false);
  const [editingFamilyId, setEditingFamilyId] = useState<number | null>(null);
  const [editFamilyName, setEditFamilyName] = useState('');
  const [editFamilyPhone, setEditFamilyPhone] = useState('');
  const [editFamilyRelationship, setEditFamilyRelationship] = useState('');
  const [editFamilyDob, setEditFamilyDob] = useState('');
  const [editFamilyAnniversary, setEditFamilyAnniversary] = useState('');
  const [isSavingFamily, setIsSavingFamily] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const user = await auth.getCurrentUser();
        if (!user) {
          setError('Unable to load profile. Please login again.');
          setLoading(false);
          return;
        }

        const match = await customers.me();
        if (!match) {
          setError('Customer profile not found for this account.');
          return;
        }

        const fullName = `${match.name || ''} ${match.lastName || ''}`.trim() || match.name || 'Customer';
        setProfile({
          id: match.id,
          name: fullName,
          email: match.email ?? null,
          phone: match.phone || match.mobile,
          address: match.address,
        });
        setEditName(fullName);
        setEditEmail(match.email ?? '');
        setEditPhone((match.phone || match.mobile || '').toString());
        loadFamily(match.id);
      } catch (e) {
        console.error('Error loading customer profile:', e);
        setError('Failed to load profile data.');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const loadFamily = async (customerId: string) => {
    try {
      setIsLoadingFamily(true);
      setFamilyError(null);
      const list = await cdm.getFamily(Number(customerId));
      setFamily(list);
    } catch (e) {
      console.error('Error loading family members:', e);
      setFamilyError('Failed to load family members.');
    } finally {
      setIsLoadingFamily(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    try {
      setIsSavingProfile(true);
      setProfileMessage(null);
      if (!editPhone.trim()) {
        setProfileMessage('Phone number is required.');
        return;
      }
      const updated = await customers.update(profile.id, {
        name: editName,
        email: editEmail.trim() ? editEmail.trim() : null,
        phone: editPhone.trim(),
      });
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              name: updated.name ?? editName,
              email: updated.email ?? (editEmail.trim() ? editEmail.trim() : null),
              phone: updated.phone ?? editPhone.trim(),
            }
          : prev,
      );
      setProfileMessage('Profile updated successfully.');
    } catch (e) {
      console.error('Error updating profile:', e);
      setProfileMessage('Failed to update profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const relationshipOptions = [
    { value: 'spouse', label: 'Spouse' },
    { value: 'child', label: 'Child' },
    { value: 'parent', label: 'Parent' },
    { value: 'sibling', label: 'Sibling' },
    { value: 'grandparent', label: 'Grandparent' },
    { value: 'other', label: 'Other' },
  ];

  const relationshipNeedsDob = (relationship: string) =>
    relationship === 'child' || relationship === 'parent' || relationship === 'grandparent';

  const relationshipNeedsAnniversary = (relationship: string) => relationship === 'spouse';

  const handleAddFamily = async () => {
    if (!profile) return;
    if (!newFamilyName || !newFamilyRelationship) {
      alert('Please enter name and relationship for the family member.');
      return;
    }
    if (!newFamilyPhone.trim()) {
      alert('Please enter phone number for the family member.');
      return;
    }
    try {
      setIsAddingFamily(true);
      const payload: any = {
        customerId: Number(profile.id),
        name: newFamilyName,
        phone: newFamilyPhone.trim(),
        relationship: newFamilyRelationship as FamilyRelationship,
      };
      if (relationshipNeedsDob(newFamilyRelationship)) {
        const dob = normalizeOptionalIsoDate('Date of Birth', newFamilyDob);
        if (dob) payload.dateOfBirth = dob;
      }
      if (relationshipNeedsAnniversary(newFamilyRelationship)) {
        const anniversary = normalizeOptionalIsoDate('Anniversary Date', newFamilyAnniversary);
        if (anniversary) payload.anniversaryDate = anniversary;
      }
      await cdm.addFamily(payload);
      alert('Family member added. An account is created/linked for this phone, and they can register once using the same phone number.');
      setNewFamilyName('');
      setNewFamilyPhone('');
      setNewFamilyRelationship('');
      setNewFamilyDob('');
      setNewFamilyAnniversary('');
      await loadFamily(profile.id);
    } catch (e) {
      console.error('Error adding family member:', e);
      alert(e instanceof Error ? e.message : 'Failed to add family member.');
    } finally {
      setIsAddingFamily(false);
    }
  };

  const handleDeleteFamily = async (id: number) => {
    if (!profile) return;
    if (!window.confirm('Remove this family member?')) return;
    try {
      await cdm.deleteFamily(id);
      await loadFamily(profile.id);
    } catch (e) {
      console.error('Error deleting family member:', e);
      alert('Failed to remove family member.');
    }
  };

  const startEditFamily = (member: any) => {
    setEditingFamilyId(member.id);
    setEditFamilyName(member.name || '');
    setEditFamilyRelationship(member.relationship || '');
    setEditFamilyPhone(member.phone || '');
    setEditFamilyDob(toDateInputValue(member.dateOfBirth));
    setEditFamilyAnniversary(toDateInputValue(member.anniversaryDate));
  };

  const cancelEditFamily = () => {
    setEditingFamilyId(null);
    setEditFamilyName('');
    setEditFamilyRelationship('');
    setEditFamilyPhone('');
    setEditFamilyDob('');
    setEditFamilyAnniversary('');
  };

  const handleSaveFamily = async () => {
    if (!profile || editingFamilyId == null) return;
    if (!editFamilyName || !editFamilyRelationship) {
      alert('Please enter name and relationship for the family member.');
      return;
    }
    if (!editFamilyPhone.trim()) {
      alert('Please enter phone number for the family member.');
      return;
    }
    try {
      setIsSavingFamily(true);
      const payload: any = {
        customerId: Number(profile.id),
        name: editFamilyName,
        phone: editFamilyPhone.trim(),
        relationship: editFamilyRelationship as FamilyRelationship,
        dateOfBirth: null,
        anniversaryDate: null,
      };
      if (relationshipNeedsDob(editFamilyRelationship)) {
        const dob = normalizeOptionalIsoDate('Date of Birth', editFamilyDob);
        if (dob) payload.dateOfBirth = dob;
      }
      if (relationshipNeedsAnniversary(editFamilyRelationship)) {
        const anniversary = normalizeOptionalIsoDate('Anniversary Date', editFamilyAnniversary);
        if (anniversary) payload.anniversaryDate = anniversary;
      }
      await cdm.updateFamily(editingFamilyId, payload);
      cancelEditFamily();
      await loadFamily(profile.id);
    } catch (e) {
      console.error('Error updating family member:', e);
      alert(e instanceof Error ? e.message : 'Failed to update family member.');
    } finally {
      setIsSavingFamily(false);
    }
  };

  return (
    <CustomerLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-4 rounded-full">
              <FaUser className="text-4xl" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">My Profile</h1>
              <p className="text-blue-100 mt-1">
                Manage your personal information and family members
              </p>
            </div>
          </div>
        </div>

        {loading && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading profile...</p>
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 flex items-start gap-3">
            <div className="flex-shrink-0 text-red-500 text-xl">⚠</div>
            <div className="text-red-700">{error}</div>
          </div>
        )}

        {profile && !loading && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Details Card */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <FaUser className="text-blue-600" />
                  Profile Information
                </h2>
              </div>
              
              <div className="p-6 space-y-5">
                {/* Name Field */}
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <FaUser className="text-gray-400" />
                    Full Name
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>

                {/* Email Field */}
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <FaEnvelope className="text-gray-400" />
                    Email Address
                  </label>
                  <input
                    type="email"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="you@example.com (optional)"
                  />
                </div>

                {/* Phone Field */}
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <FaPhone className="text-gray-400" />
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="Enter your phone number"
                    required
                  />
                </div>

                {/* Address Field */}
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <FaMapMarkerAlt className="text-gray-400" />
                    Address
                  </label>
                  <div className="w-full border border-gray-200 bg-gray-50 rounded-lg px-4 py-3 text-gray-600">
                    {profile.address || 'Not set - Manage in Addresses section'}
                  </div>
                </div>

                {/* Success/Error Message */}
                {profileMessage && (
                  <div className={`rounded-lg p-3 text-sm ${
                    profileMessage.includes('success') 
                      ? 'bg-green-50 text-green-700 border border-green-200' 
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {profileMessage}
                  </div>
                )}

                {/* Save Button */}
                <div className="pt-4 border-t">
                  <button
                    onClick={handleSaveProfile}
                    disabled={isSavingProfile}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md hover:shadow-lg"
                  >
                    <FaSave />
                    {isSavingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
                  </button>
                </div>
              </div>
            </div>

            {/* Family Members Card */}
            <div className="lg:col-span-1 bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-purple-50 to-purple-100 px-6 py-4 border-b">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <FaUsers className="text-purple-600" />
                  Family Members
                </h2>
              </div>

              <div className="p-6">
                {isLoadingFamily ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-3"></div>
                    <p className="text-gray-500 text-sm">Loading...</p>
                  </div>
                ) : familyError ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                    {familyError}
                  </div>
                ) : family.length > 0 ? (
                  <div className="space-y-3 mb-6">
                    {family.map((member: any) => {
                      const isEditing = editingFamilyId === member.id;
                      return (
                        <div key={member.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                          {isEditing ? (
                            <div className="space-y-3">
                              <input
                                type="text"
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                value={editFamilyName}
                                onChange={(e) => setEditFamilyName(e.target.value)}
                                placeholder="Name"
                              />
                              <select
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                value={editFamilyRelationship}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setEditFamilyRelationship(value);
                                  if (!relationshipNeedsDob(value)) setEditFamilyDob('');
                                  if (!relationshipNeedsAnniversary(value)) setEditFamilyAnniversary('');
                                }}
                              >
                                <option value="">Select relationship</option>
                                {relationshipOptions.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="tel"
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                value={editFamilyPhone}
                                onChange={(e) => setEditFamilyPhone(e.target.value)}
                                placeholder="Phone number"
                                required
                              />

                              {relationshipNeedsDob(editFamilyRelationship) && (
                                <input
                                  type="text"
                                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                  value={editFamilyDob}
                                  onChange={(e) => setEditFamilyDob(e.target.value)}
                                  placeholder="Date of Birth (YYYY-MM-DD)"
                                  inputMode="numeric"
                                />
                              )}

                              {relationshipNeedsAnniversary(editFamilyRelationship) && (
                                <input
                                  type="text"
                                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                  value={editFamilyAnniversary}
                                  onChange={(e) => setEditFamilyAnniversary(e.target.value)}
                                  placeholder="Anniversary Date (YYYY-MM-DD)"
                                  inputMode="numeric"
                                />
                              )}
                              <div className="flex gap-2">
                                <button
                                  onClick={handleSaveFamily}
                                  disabled={isSavingFamily}
                                  className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 disabled:opacity-50"
                                >
                                  <FaSave /> {isSavingFamily ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                  onClick={cancelEditFamily}
                                  className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-400"
                                >
                                  <FaTimes /> Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="mb-3">
                                <div className="font-semibold text-gray-900 text-lg">{member.name}</div>
                                <div className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                                  <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-medium">
                                    {member.relationship}
                                  </span>
                                </div>
                                {member.phone && (
                                  <div className="text-sm text-gray-600 flex items-center gap-1 mt-2">
                                    <FaPhone className="text-gray-400 text-xs" />
                                    {member.phone}
                                  </div>
                                )}

                                {member.dateOfBirth && (
                                  <div className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                                    <span className="text-gray-400">DOB:</span>
                                    <span>{toDateInputValue(member.dateOfBirth)}</span>
                                  </div>
                                )}

                                {member.anniversaryDate && (
                                  <div className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                                    <span className="text-gray-400">Anniversary:</span>
                                    <span>{toDateInputValue(member.anniversaryDate)}</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-2 pt-3 border-t">
                                <button
                                  onClick={() => startEditFamily(member)}
                                  className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 text-sm font-medium rounded hover:bg-blue-100 transition"
                                >
                                  <FaEdit /> Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteFamily(member.id)}
                                  className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 text-sm font-medium rounded hover:bg-red-100 transition"
                                >
                                  <FaTrash /> Remove
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FaUsers className="mx-auto text-4xl text-gray-300 mb-3" />
                    <p className="text-sm">No family members added yet</p>
                  </div>
                )}

                {/* Add Family Member Form */}
                <div className="pt-4 mt-4 border-t">
                  <div className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <FaUserPlus className="text-purple-600" />
                    Add Family Member
                  </div>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Name"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      value={newFamilyName}
                      onChange={(e) => setNewFamilyName(e.target.value)}
                    />
                    <select
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      value={newFamilyRelationship}
                      onChange={(e) => {
                        const value = e.target.value;
                        setNewFamilyRelationship(value);
                        if (!relationshipNeedsDob(value)) setNewFamilyDob('');
                        if (!relationshipNeedsAnniversary(value)) setNewFamilyAnniversary('');
                      }}
                    >
                      <option value="">Select relationship</option>
                      {relationshipOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      placeholder="Phone number"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      value={newFamilyPhone}
                      onChange={(e) => setNewFamilyPhone(e.target.value)}
                      required
                    />

                    {relationshipNeedsDob(newFamilyRelationship) && (
                      <input
                        type="text"
                        placeholder="Date of Birth (YYYY-MM-DD)"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        value={newFamilyDob}
                        onChange={(e) => setNewFamilyDob(e.target.value)}
                        inputMode="numeric"
                      />
                    )}

                    {relationshipNeedsAnniversary(newFamilyRelationship) && (
                      <input
                        type="text"
                        placeholder="Anniversary Date (YYYY-MM-DD)"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        value={newFamilyAnniversary}
                        onChange={(e) => setNewFamilyAnniversary(e.target.value)}
                        inputMode="numeric"
                      />
                    )}
                    <button
                      onClick={handleAddFamily}
                      disabled={isAddingFamily}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md hover:shadow-lg"
                    >
                      <FaUserPlus />
                      {isAddingFamily ? 'Adding...' : 'Add Member'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}

