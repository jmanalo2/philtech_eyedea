import React, { useEffect, useState, useRef } from 'react';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { Plus, Trash2, Edit, Users, Briefcase, Building, UsersRound, Upload, Download, Wrench } from 'lucide-react';

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [pillars, setPillars] = useState([]);
  const [teams, setTeams] = useState([]);
  const [techPersons, setTechPersons] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [newDepartment, setNewDepartment] = useState({ name: '', pillar: '' });
  const [newPillar, setNewPillar] = useState('');
  const [newTeam, setNewTeam] = useState({ name: '', pillar: '', department: '' });
  const [newTechPerson, setNewTechPerson] = useState({ name: '', email: '', specialization: '' });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const [usersRes, deptsRes, pillarsRes, teamsRes, techRes] = await Promise.all([
        api.get('/api/admin/users'),
        api.get('/api/admin/departments'),
        api.get('/api/admin/pillars'),
        api.get('/api/admin/teams'),
        api.get('/api/admin/tech-persons')
      ]);
      setUsers(usersRes.data);
      setDepartments(deptsRes.data);
      setPillars(pillarsRes.data);
      setTeams(teamsRes.data);
      setTechPersons(techRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    try {
      await api.put(`/api/admin/users/${editingUser.id}`, {
        username: editingUser.username,
        email: editingUser.email,
        role: editingUser.role,
        department: editingUser.department,
        team: editingUser.team,
        pillar: editingUser.pillar,
        manager: editingUser.manager,
        approved_pillars: editingUser.approved_pillars || [],
        approved_departments: editingUser.approved_departments || []
      });
      toast.success('User updated successfully');
      setShowUserDialog(false);
      setEditingUser(null);
      fetchAllData();
    } catch (error) {
      toast.error('Failed to update user');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.delete(`/api/admin/users/${userId}`);
      toast.success('User deleted');
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete user');
    }
  };

  const handleBulkUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post(
        '/api/admin/users/bulk-upload',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      toast.success(response.data.message);
      if (response.data.errors && response.data.errors.length > 0) {
        console.log('Errors:', response.data.errors);
        toast.warning(`${response.data.errors.length} errors occurred. Check console for details.`);
      }
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upload file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    const csvContent = 'username,email,password,role,department,team,pillar,manager,approved_pillars,approved_departments\n' +
      'johndoe,john@philtech.com,password123,user,Operations,Allowance Billing,GBS,manager1,,\n' +
      'janesmith,jane@philtech.com,password123,approver,Technology,,Tech,admin,Tech;Finance,Technology;Finance';
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'user_upload_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleAddDepartment = async () => {
    if (!newDepartment.name.trim() || !newDepartment.pillar) return;
    try {
      await api.post('/api/admin/departments', newDepartment);
      toast.success('Department added');
      setNewDepartment({ name: '', pillar: '' });
      fetchAllData();
    } catch (error) {
      toast.error('Failed to add department');
    }
  };

  const handleDeleteDepartment = async (deptId) => {
    if (!window.confirm('Are you sure?')) return;
    try {
      await api.delete(`/api/admin/departments/${deptId}`);
      toast.success('Department deleted');
      fetchAllData();
    } catch (error) {
      toast.error('Failed to delete department');
    }
  };

  const handleAddPillar = async () => {
    if (!newPillar.trim()) return;
    try {
      await api.post('/api/admin/pillars', { name: newPillar });
      toast.success('Pillar added');
      setNewPillar('');
      fetchAllData();
    } catch (error) {
      toast.error('Failed to add pillar');
    }
  };

  const handleDeletePillar = async (pillarId) => {
    if (!window.confirm('Are you sure?')) return;
    try {
      await api.delete(`/api/admin/pillars/${pillarId}`);
      toast.success('Pillar deleted');
      fetchAllData();
    } catch (error) {
      toast.error('Failed to delete pillar');
    }
  };

  const handleAddTeam = async () => {
    if (!newTeam.name.trim() || !newTeam.pillar || !newTeam.department) return;
    try {
      await api.post('/api/admin/teams', newTeam);
      toast.success('Team added');
      setNewTeam({ name: '', pillar: '', department: '' });
      fetchAllData();
    } catch (error) {
      toast.error('Failed to add team');
    }
  };

  const handleDeleteTeam = async (teamId) => {
    if (!window.confirm('Are you sure?')) return;
    try {
      await api.delete(`/api/admin/teams/${teamId}`);
      toast.success('Team deleted');
      fetchAllData();
    } catch (error) {
      toast.error('Failed to delete team');
    }
  };

  const handleAddTechPerson = async () => {
    if (!newTechPerson.name.trim()) return;
    try {
      await api.post('/api/admin/tech-persons', newTechPerson);
      toast.success('Tech & Engineering person added');
      setNewTechPerson({ name: '', email: '', specialization: '' });
      fetchAllData();
    } catch (error) {
      toast.error('Failed to add tech person');
    }
  };

  const handleDeleteTechPerson = async (personId) => {
    if (!window.confirm('Are you sure?')) return;
    try {
      await api.delete(`/api/admin/tech-persons/${personId}`);
      toast.success('Tech person deleted');
      fetchAllData();
    } catch (error) {
      toast.error('Failed to delete tech person');
    }
  };

  const handleSeedData = async () => {
    try {
      await api.post('/api/admin/seed-data');
      toast.success('Sample data seeded successfully');
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to seed data');
    }
  };

  const toggleApprovedPillar = (pillar) => {
    if (!editingUser) return;
    const current = editingUser.approved_pillars || [];
    const updated = current.includes(pillar)
      ? current.filter(p => p !== pillar)
      : [...current, pillar];
    setEditingUser({ ...editingUser, approved_pillars: updated });
  };

  const toggleApprovedDepartment = (dept) => {
    if (!editingUser) return;
    const current = editingUser.approved_departments || [];
    const updated = current.includes(dept)
      ? current.filter(d => d !== dept)
      : [...current, dept];
    setEditingUser({ ...editingUser, approved_departments: updated });
  };

  return (
    <div data-testid="admin-panel-page">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Panel</h1>
        <p className="text-gray-600">Manage users, departments, pillars, and teams</p>
      </div>

      <div className="mb-6">
        <Button
          data-testid="seed-data-btn"
          onClick={handleSeedData}
          className="bg-purple-600 hover:bg-purple-700"
        >
          Seed Sample Data
        </Button>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="users" data-testid="users-tab">
            <Users className="w-4 h-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="pillars" data-testid="pillars-tab">
            <Briefcase className="w-4 h-4 mr-2" />
            Pillars
          </TabsTrigger>
          <TabsTrigger value="departments" data-testid="departments-tab">
            <Building className="w-4 h-4 mr-2" />
            Departments
          </TabsTrigger>
          <TabsTrigger value="teams" data-testid="teams-tab">
            <UsersRound className="w-4 h-4 mr-2" />
            Teams
          </TabsTrigger>
          <TabsTrigger value="tech" data-testid="tech-tab">
            <Wrench className="w-4 h-4 mr-2" />
            Tech & Eng
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Manage Users</CardTitle>
                  <CardDescription>View and edit user roles and assignments</CardDescription>
                </div>
                <div className="flex gap-3">
                  <Button
                    data-testid="download-template-btn"
                    variant="outline"
                    onClick={downloadTemplate}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Template
                  </Button>
                  <Button
                    data-testid="bulk-upload-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? 'Uploading...' : 'Bulk Upload'}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleBulkUpload}
                    className="hidden"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Pillar</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead>Manager</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                        <TableCell className="font-medium">{user.username}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                            user.role === 'approver' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {user.role}
                          </span>
                        </TableCell>
                        <TableCell>{user.pillar || '-'}</TableCell>
                        <TableCell>{user.department || '-'}</TableCell>
                        <TableCell>{user.team || '-'}</TableCell>
                        <TableCell>{user.manager || '-'}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            data-testid={`edit-user-${user.id}`}
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingUser({
                                ...user,
                                approved_pillars: user.approved_pillars || [],
                                approved_departments: user.approved_departments || []
                              });
                              setShowUserDialog(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            data-testid={`delete-user-${user.id}`}
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Departments Tab */}
        <TabsContent value="departments">
          <Card>
            <CardHeader>
              <CardTitle>Manage Departments</CardTitle>
              <CardDescription>Add or remove departments (linked to pillars)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex space-x-3">
                <Input
                  data-testid="new-department-input"
                  value={newDepartment.name}
                  onChange={(e) => setNewDepartment({ ...newDepartment, name: e.target.value })}
                  placeholder="Department name"
                  className="flex-1"
                />
                <Select value={newDepartment.pillar} onValueChange={(value) => setNewDepartment({ ...newDepartment, pillar: value })}>
                  <SelectTrigger data-testid="new-department-pillar-select" className="w-[200px]">
                    <SelectValue placeholder="Select Pillar" />
                  </SelectTrigger>
                  <SelectContent>
                    {pillars.map((pillar) => (
                      <SelectItem key={pillar.id} value={pillar.name}>{pillar.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button data-testid="add-department-btn" onClick={handleAddDepartment}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>
              <div className="space-y-4">
                {pillars.map((pillar) => {
                  const pillarDepts = departments.filter(d => d.pillar === pillar.name);
                  if (pillarDepts.length === 0) return null;
                  return (
                    <div key={pillar.id}>
                      <h3 className="font-semibold text-gray-900 mb-3">{pillar.name}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {pillarDepts.map((dept) => (
                          <div
                            key={dept.id}
                            data-testid={`department-${dept.id}`}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                          >
                            <span>{dept.name}</span>
                            <Button
                              data-testid={`delete-department-${dept.id}`}
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteDepartment(dept.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pillars Tab */}
        <TabsContent value="pillars">
          <Card>
            <CardHeader>
              <CardTitle>Manage Pillars</CardTitle>
              <CardDescription>Add or remove organizational pillars</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex space-x-3">
                <Input
                  data-testid="new-pillar-input"
                  value={newPillar}
                  onChange={(e) => setNewPillar(e.target.value)}
                  placeholder="Pillar name"
                />
                <Button data-testid="add-pillar-btn" onClick={handleAddPillar}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pillars.map((pillar) => (
                  <div
                    key={pillar.id}
                    data-testid={`pillar-${pillar.id}`}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border"
                  >
                    <span className="font-medium">{pillar.name}</span>
                    <Button
                      data-testid={`delete-pillar-${pillar.id}`}
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePillar(pillar.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Teams Tab */}
        <TabsContent value="teams">
          <Card>
            <CardHeader>
              <CardTitle>Manage Teams</CardTitle>
              <CardDescription>Add or remove teams within departments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex space-x-3 flex-wrap gap-2">
                <Input
                  data-testid="new-team-name-input"
                  value={newTeam.name}
                  onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                  placeholder="Team name"
                  className="flex-1 min-w-[150px]"
                />
                <Select value={newTeam.pillar} onValueChange={(value) => setNewTeam({ ...newTeam, pillar: value, department: '' })}>
                  <SelectTrigger data-testid="new-team-pillar-select" className="w-[150px]">
                    <SelectValue placeholder="Select Pillar" />
                  </SelectTrigger>
                  <SelectContent>
                    {pillars.map((pillar) => (
                      <SelectItem key={pillar.id} value={pillar.name}>{pillar.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select 
                  value={newTeam.department} 
                  onValueChange={(value) => setNewTeam({ ...newTeam, department: value })}
                  disabled={!newTeam.pillar}
                >
                  <SelectTrigger data-testid="new-team-department-select" className="w-[180px]">
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments
                      .filter(d => d.pillar === newTeam.pillar)
                      .map((dept) => (
                        <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button data-testid="add-team-btn" onClick={handleAddTeam}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>
              <div className="space-y-6">
                {pillars.map((pillar) => {
                  const pillarDepts = departments.filter(d => d.pillar === pillar.name);
                  const pillarTeams = teams.filter(t => t.pillar === pillar.name);
                  if (pillarTeams.length === 0) return null;
                  return (
                    <div key={pillar.id} className="border rounded-lg p-4">
                      <h3 className="font-bold text-blue-800 mb-4">{pillar.name}</h3>
                      {pillarDepts.map((dept) => {
                        const deptTeams = pillarTeams.filter(t => t.department === dept.name);
                        if (deptTeams.length === 0) return null;
                        return (
                          <div key={dept.id} className="ml-4 mb-4">
                            <h4 className="font-semibold text-gray-700 mb-2">{dept.name}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-4">
                              {deptTeams.map((team) => (
                                <div
                                  key={team.id}
                                  data-testid={`team-${team.id}`}
                                  className="flex items-center justify-between p-2 bg-gray-50 rounded border"
                                >
                                  <span className="text-sm">{team.name}</span>
                                  <Button
                                    data-testid={`delete-team-${team.id}`}
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteTeam(team.id)}
                                  >
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tech & Engineering Tab */}
        <TabsContent value="tech">
          <Card>
            <CardHeader>
              <CardTitle>Tech & Engineering Personnel</CardTitle>
              <CardDescription>Manage technical resources for complex idea implementation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex space-x-3 flex-wrap gap-2">
                <Input
                  data-testid="new-tech-name-input"
                  value={newTechPerson.name}
                  onChange={(e) => setNewTechPerson({ ...newTechPerson, name: e.target.value })}
                  placeholder="Full name"
                  className="flex-1 min-w-[150px]"
                />
                <Input
                  data-testid="new-tech-email-input"
                  type="email"
                  value={newTechPerson.email}
                  onChange={(e) => setNewTechPerson({ ...newTechPerson, email: e.target.value })}
                  placeholder="Email address"
                  className="flex-1 min-w-[150px]"
                />
                <Input
                  data-testid="new-tech-specialization-input"
                  value={newTechPerson.specialization}
                  onChange={(e) => setNewTechPerson({ ...newTechPerson, specialization: e.target.value })}
                  placeholder="Specialization"
                  className="flex-1 min-w-[150px]"
                />
                <Button data-testid="add-tech-btn" onClick={handleAddTechPerson} className="bg-blue-700 hover:bg-blue-800">
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Specialization</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {techPersons.map((person) => (
                      <TableRow key={person.id} data-testid={`tech-person-${person.id}`}>
                        <TableCell className="font-medium">{person.name}</TableCell>
                        <TableCell>{person.email || '-'}</TableCell>
                        <TableCell>
                          {person.specialization ? (
                            <Badge variant="outline" className="bg-blue-50">{person.specialization}</Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            data-testid={`delete-tech-${person.id}`}
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteTechPerson(person.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="edit-user-dialog">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information and role assignments</DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Username</Label>
                  <Input
                    data-testid="edit-username-input"
                    value={editingUser.username}
                    onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    data-testid="edit-email-input"
                    type="email"
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Role</Label>
                  <Select value={editingUser.role} onValueChange={(value) => setEditingUser({ ...editingUser, role: value })}>
                    <SelectTrigger data-testid="edit-role-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="approver">Approver</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Pillar</Label>
                  <Select value={editingUser.pillar || ''} onValueChange={(value) => setEditingUser({ ...editingUser, pillar: value })}>
                    <SelectTrigger data-testid="edit-pillar-select">
                      <SelectValue placeholder="Select Pillar" />
                    </SelectTrigger>
                    <SelectContent>
                      {pillars.map((pillar) => (
                        <SelectItem key={pillar.id} value={pillar.name}>{pillar.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Department</Label>
                  <Select value={editingUser.department || ''} onValueChange={(value) => setEditingUser({ ...editingUser, department: value })}>
                    <SelectTrigger data-testid="edit-department-select">
                      <SelectValue placeholder="Select Department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Team</Label>
                  <Select value={editingUser.team || ''} onValueChange={(value) => setEditingUser({ ...editingUser, team: value })}>
                    <SelectTrigger data-testid="edit-team-select">
                      <SelectValue placeholder="Select Team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.name}>{team.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Manager</Label>
                <Input
                  data-testid="edit-manager-input"
                  value={editingUser.manager || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, manager: e.target.value })}
                  placeholder="Manager username or name"
                />
              </div>

              {editingUser.role === 'approver' && (
                <>
                  <div>
                    <Label className="block mb-2">Approved Pillars (Select pillars this approver can approve)</Label>
                    <div className="flex flex-wrap gap-2">
                      {pillars.map((pillar) => (
                        <Badge
                          key={pillar.id}
                          variant="outline"
                          className={`cursor-pointer ${
                            editingUser.approved_pillars?.includes(pillar.name)
                              ? 'bg-blue-100 border-blue-500'
                              : 'hover:bg-gray-100'
                          }`}
                          onClick={() => toggleApprovedPillar(pillar.name)}
                        >
                          {pillar.name}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="block mb-2">Approved Departments (Select departments this approver can approve)</Label>
                    <div className="flex flex-wrap gap-2">
                      {departments.map((dept) => (
                        <Badge
                          key={dept.id}
                          variant="outline"
                          className={`cursor-pointer ${
                            editingUser.approved_departments?.includes(dept.name)
                              ? 'bg-green-100 border-green-500'
                              : 'hover:bg-gray-100'
                          }`}
                          onClick={() => toggleApprovedDepartment(dept.name)}
                        >
                          {dept.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <Button variant="outline" onClick={() => setShowUserDialog(false)}>Cancel</Button>
                <Button data-testid="save-user-btn" onClick={handleUpdateUser} className="bg-blue-700 hover:bg-blue-800">
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}