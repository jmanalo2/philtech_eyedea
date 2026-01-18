import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { User, Mail, Shield, Building, Users, Key, Briefcase, CheckCircle } from 'lucide-react';

export default function Profile() {
  const { user } = useAuth();
  const [changingPassword, setChangingPassword] = useState(false);
  const [changingSubRole, setChangingSubRole] = useState(false);
  const [selectedSubRole, setSelectedSubRole] = useState(user?.sub_role || '');
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordForm.new_password.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    try {
      await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/auth/change-password`, {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      });
      toast.success('Password changed successfully');
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      setChangingPassword(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to change password');
    }
  };

  const handleSubRoleChange = async () => {
    if (!selectedSubRole) {
      toast.error('Please select a sub-role');
      return;
    }

    try {
      await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/auth/set-sub-role`, {
        sub_role: selectedSubRole
      });
      toast.success('Sub-role updated successfully! Please refresh the page.');
      setChangingSubRole(false);
      // Refresh the page to update permissions
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to change sub-role');
    }
  };

  if (!user) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  const getRoleBadge = (role) => {
    const variants = {
      admin: 'bg-purple-100 text-purple-800 border-purple-300',
      approver: 'bg-blue-100 text-blue-800 border-blue-300',
      user: 'bg-gray-100 text-gray-800 border-gray-300'
    };
    return variants[role] || variants.user;
  };

  return (
    <div data-testid="profile-page">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile</h1>
        <p className="text-gray-600">View your account information and manage access</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Your personal and organizational details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-4 pb-4 border-b">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{user.username}</h2>
                  <Badge className={getRoleBadge(user.role)} data-testid="user-role-badge">
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center space-x-2 text-gray-600 mb-2">
                      <Mail className="w-4 h-4" />
                      <span className="text-sm font-semibold">Email</span>
                    </div>
                    <p className="text-gray-900" data-testid="user-email">{user.email}</p>
                  </div>

                  <div>
                    <div className="flex items-center space-x-2 text-gray-600 mb-2">
                      <Shield className="w-4 h-4" />
                      <span className="text-sm font-semibold">Role</span>
                    </div>
                    <p className="text-gray-900">{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</p>
                  </div>

                  <div>
                    <div className="flex items-center space-x-2 text-gray-600 mb-2">
                      <Briefcase className="w-4 h-4" />
                      <span className="text-sm font-semibold">Pillar</span>
                    </div>
                    <p className="text-gray-900" data-testid="user-pillar">{user.pillar || 'Not assigned'}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center space-x-2 text-gray-600 mb-2">
                      <Building className="w-4 h-4" />
                      <span className="text-sm font-semibold">Department</span>
                    </div>
                    <p className="text-gray-900" data-testid="user-department">{user.department || 'Not assigned'}</p>
                  </div>

                  <div>
                    <div className="flex items-center space-x-2 text-gray-600 mb-2">
                      <Users className="w-4 h-4" />
                      <span className="text-sm font-semibold">Team</span>
                    </div>
                    <p className="text-gray-900" data-testid="user-team">{user.team || 'Not assigned'}</p>
                  </div>

                  <div>
                    <div className="flex items-center space-x-2 text-gray-600 mb-2">
                      <User className="w-4 h-4" />
                      <span className="text-sm font-semibold">Manager</span>
                    </div>
                    <p className="text-gray-900">{user.manager || 'Not assigned'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Password Change */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Security</CardTitle>
                  <CardDescription>Change your password</CardDescription>
                </div>
                {!changingPassword && (
                  <Button
                    data-testid="change-password-btn"
                    onClick={() => setChangingPassword(true)}
                    variant="outline"
                  >
                    <Key className="w-4 h-4 mr-2" />
                    Change Password
                  </Button>
                )}
              </div>
            </CardHeader>
            {changingPassword && (
              <CardContent>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div>
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input
                      id="current-password"
                      data-testid="current-password-input"
                      type="password"
                      value={passwordForm.current_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      data-testid="new-password-input"
                      type="password"
                      value={passwordForm.new_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input
                      id="confirm-password"
                      data-testid="confirm-password-input"
                      type="password"
                      value={passwordForm.confirm_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                      required
                    />
                  </div>
                  <div className="flex space-x-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setChangingPassword(false);
                        setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      data-testid="save-password-btn"
                      className="bg-blue-700 hover:bg-blue-800"
                    >
                      Save New Password
                    </Button>
                  </div>
                </form>
              </CardContent>
            )}
          </Card>

          {/* Sub-Role Selector for Approvers */}
          {user.role === 'approver' && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Approver Sub-Role</CardTitle>
                    <CardDescription>Change your approver sub-role and permissions</CardDescription>
                  </div>
                  {!changingSubRole && (
                    <Button
                      data-testid="change-subrole-btn"
                      onClick={() => {
                        setChangingSubRole(true);
                        setSelectedSubRole(user.sub_role || '');
                      }}
                      variant="outline"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Change Sub-Role
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!changingSubRole ? (
                  <div>
                    <div className="flex items-center space-x-3 mb-4">
                      <span className="text-sm font-semibold text-gray-700">Current Sub-Role:</span>
                      <Badge className={user.sub_role === 'approver' ? 'bg-blue-600' : 'bg-green-600'}>
                        {user.sub_role === 'approver' ? 'Approver' : user.sub_role === 'ci_excellence' ? 'C.I. Excellence Team' : 'Not Set'}
                      </Badge>
                    </div>
                    {user.sub_role === 'approver' && (
                      <p className="text-sm text-gray-600">You can approve, decline, and request revisions on Eye-deas.</p>
                    )}
                    {user.sub_role === 'ci_excellence' && (
                      <p className="text-sm text-gray-600">You can evaluate approved Eye-deas, assign complexity, and track savings.</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button
                        onClick={() => setSelectedSubRole('approver')}
                        className={`p-6 border-2 rounded-lg text-left transition-all ${
                          selectedSubRole === 'approver'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300 hover:border-blue-300'
                        }`}
                      >
                        <CheckCircle className="w-8 h-8 text-blue-600 mb-3" />
                        <h3 className="font-bold text-gray-900 mb-2">Approver</h3>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• Approve Eye-deas</li>
                          <li>• Decline Eye-deas</li>
                          <li>• Request Revisions</li>
                        </ul>
                      </button>

                      <button
                        onClick={() => setSelectedSubRole('ci_excellence')}
                        className={`p-6 border-2 rounded-lg text-left transition-all ${
                          selectedSubRole === 'ci_excellence'
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-300 hover:border-green-300'
                        }`}
                      >
                        <Users className="w-8 h-8 text-green-600 mb-3" />
                        <h3 className="font-bold text-gray-900 mb-2">C.I. Excellence Team</h3>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• Evaluate approved ideas</li>
                          <li>• Assign complexity levels</li>
                          <li>• Track cost & time savings</li>
                          <li>• Assign to Tech Team</li>
                        </ul>
                      </button>
                    </div>
                    
                    <div className="flex space-x-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setChangingSubRole(false);
                          setSelectedSubRole(user.sub_role || '');
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        data-testid="save-subrole-btn"
                        onClick={handleSubRoleChange}
                        className="flex-1 bg-blue-700 hover:bg-blue-800"
                      >
                        Save Sub-Role
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Access & Security Card */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Access & Permissions</CardTitle>
              <CardDescription>Your role permissions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Permissions</h3>
                <ul className="space-y-2 text-sm">
                  {user.role === 'admin' && (
                    <>
                      <li className="flex items-center text-green-700">
                        <span className="w-2 h-2 bg-green-700 rounded-full mr-2"></span>
                        Full system access
                      </li>
                      <li className="flex items-center text-green-700">
                        <span className="w-2 h-2 bg-green-700 rounded-full mr-2"></span>
                        Manage users
                      </li>
                      <li className="flex items-center text-green-700">
                        <span className="w-2 h-2 bg-green-700 rounded-full mr-2"></span>
                        Manage departments & pillars
                      </li>
                      <li className="flex items-center text-green-700">
                        <span className="w-2 h-2 bg-green-700 rounded-full mr-2"></span>
                        Access C.I. Analytics Dashboard
                      </li>
                    </>
                  )}
                  {user.role === 'approver' && user.sub_role === 'approver' && (
                    <>
                      <li className="flex items-center text-blue-700">
                        <span className="w-2 h-2 bg-blue-700 rounded-full mr-2"></span>
                        Approve Eye-deas
                      </li>
                      <li className="flex items-center text-blue-700">
                        <span className="w-2 h-2 bg-blue-700 rounded-full mr-2"></span>
                        Request revisions
                      </li>
                      <li className="flex items-center text-blue-700">
                        <span className="w-2 h-2 bg-blue-700 rounded-full mr-2"></span>
                        Decline submissions
                      </li>
                    </>
                  )}
                  {user.role === 'approver' && user.sub_role === 'ci_excellence' && (
                    <>
                      <li className="flex items-center text-green-700">
                        <span className="w-2 h-2 bg-green-700 rounded-full mr-2"></span>
                        Evaluate approved Eye-deas
                      </li>
                      <li className="flex items-center text-green-700">
                        <span className="w-2 h-2 bg-green-700 rounded-full mr-2"></span>
                        Assign complexity levels
                      </li>
                      <li className="flex items-center text-green-700">
                        <span className="w-2 h-2 bg-green-700 rounded-full mr-2"></span>
                        Track cost & time savings
                      </li>
                      <li className="flex items-center text-green-700">
                        <span className="w-2 h-2 bg-green-700 rounded-full mr-2"></span>
                        Assign ideas to Tech Team
                      </li>
                      <li className="flex items-center text-green-700">
                        <span className="w-2 h-2 bg-green-700 rounded-full mr-2"></span>
                        Access C.I. Analytics Dashboard
                      </li>
                    </>
                  )}
                  {user.role === 'approver' && user.approved_pillars && user.approved_pillars.length > 0 && (
                    <li className="flex items-start text-blue-700 mt-3">
                      <span className="w-2 h-2 bg-blue-700 rounded-full mr-2 mt-1.5"></span>
                      <div>
                        <span className="font-semibold">Approved Pillars:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {user.approved_pillars.map((p, i) => (
                            <Badge key={i} variant="outline" className="text-xs">{p}</Badge>
                          ))}
                        </div>
                      </div>
                    </li>
                  )}
                  {user.role === 'approver' && user.approved_departments && user.approved_departments.length > 0 && (
                    <li className="flex items-start text-blue-700 mt-3">
                      <span className="w-2 h-2 bg-blue-700 rounded-full mr-2 mt-1.5"></span>
                      <div>
                        <span className="font-semibold">Approved Departments:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {user.approved_departments.map((d, i) => (
                            <Badge key={i} variant="outline" className="text-xs">{d}</Badge>
                          ))}
                        </div>
                      </div>
                    </li>
                  )}
                  <li className="flex items-center text-gray-700">
                    <span className="w-2 h-2 bg-gray-700 rounded-full mr-2"></span>
                    Submit Eye-deas
                  </li>
                  <li className="flex items-center text-gray-700">
                    <span className="w-2 h-2 bg-gray-700 rounded-full mr-2"></span>
                    View all Eye-deas
                  </li>
                  <li className="flex items-center text-gray-700">
                    <span className="w-2 h-2 bg-gray-700 rounded-full mr-2"></span>
                    Add comments
                  </li>
                </ul>
              </div>

              <div className="pt-4 border-t">
                <h3 className="font-semibold text-gray-900 mb-2">Account Status</h3>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-700">Active</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}