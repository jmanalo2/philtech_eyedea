import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { Lightbulb } from 'lucide-react';

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [pillars, setPillars] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [managers, setManagers] = useState([]);
  const [filteredDepartments, setFilteredDepartments] = useState([]);
  const [filteredTeams, setFilteredTeams] = useState([]);

  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    confirmPassword: '',
    role: 'user',
    pillar: '',
    department: '',
    team: '',
    manager: ''
  });

  useEffect(() => {
    fetchOrganizationalData();
  }, []);

  useEffect(() => {
    if (registerForm.pillar) {
      const filtered = departments.filter(dept => dept.pillar === registerForm.pillar);
      setFilteredDepartments(filtered);
      setRegisterForm(prev => ({ ...prev, department: '', team: '' }));
    } else {
      setFilteredDepartments([]);
    }
  }, [registerForm.pillar, departments]);

  useEffect(() => {
    if (registerForm.department) {
      const filtered = teams.filter(team => team.department === registerForm.department);
      setFilteredTeams(filtered);
      setRegisterForm(prev => ({ ...prev, team: '' }));
    } else {
      setFilteredTeams([]);
    }
  }, [registerForm.department, teams]);

  const fetchOrganizationalData = async () => {
    try {
      // Use public endpoints that don't require authentication
      const [pillarsRes, deptsRes, teamsRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/public/pillars`).catch(() => ({ data: [] })),
        axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/public/departments`).catch(() => ({ data: [] })),
        axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/public/teams`).catch(() => ({ data: [] }))
      ]);
      setPillars(pillarsRes.data);
      setDepartments(deptsRes.data);
      setTeams(teamsRes.data);
      
      // Managers can't be fetched without auth, so leave empty for now
      // User can select their manager from a text input or after registration
      setManagers([]);
    } catch (error) {
      console.error('Failed to fetch organizational data:', error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(loginForm.username, loginForm.password);
      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (registerForm.password !== registerForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (!registerForm.manager.trim()) {
      toast.error('Manager name is required');
      return;
    }
    setLoading(true);
    try {
      const userData = {
        username: registerForm.username,
        email: registerForm.email,
        first_name: registerForm.first_name || undefined,
        last_name: registerForm.last_name || undefined,
        password: registerForm.password,
        role: registerForm.role,
        pillar: registerForm.pillar || undefined,
        department: registerForm.department || undefined,
        team: registerForm.team || undefined,
        manager: registerForm.manager
      };
      
      await register(userData);
      toast.success('Registration successful! Please login.');
      setRegisterForm({ 
        username: '', 
        email: '', 
        first_name: '',
        last_name: '',
        password: '', 
        confirmPassword: '',
        role: 'user',
        pillar: '',
        department: '',
        team: '',
        manager: ''
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center px-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-700 rounded-2xl mb-4">
            <Lightbulb className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-blue-900 mb-2">Philtech Eye-dea</h1>
          <p className="text-gray-600">Innovation Management System</p>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>Login or create an account to get started</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login" data-testid="login-tab">Login</TabsTrigger>
                <TabsTrigger value="register" data-testid="register-tab">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login" data-testid="login-form">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Label htmlFor="login-username">Username</Label>
                    <Input
                      id="login-username"
                      data-testid="login-username-input"
                      value={loginForm.username}
                      onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      data-testid="login-password-input"
                      type="password"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    data-testid="login-submit-btn"
                    className="w-full bg-blue-700 hover:bg-blue-800"
                    disabled={loading}
                  >
                    {loading ? 'Logging in...' : 'Login'}
                  </Button>
                  <div className="text-center mt-3">
                    <Link to="/forgot-password" className="text-sm text-blue-700 hover:text-blue-800 hover:underline">
                      Forgot Password?
                    </Link>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="register" data-testid="register-form">
                <form onSubmit={handleRegister} className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="register-first-name">First Name</Label>
                      <Input
                        id="register-first-name"
                        data-testid="register-first-name-input"
                        value={registerForm.first_name}
                        onChange={(e) => setRegisterForm({ ...registerForm, first_name: e.target.value })}
                        placeholder="First name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="register-last-name">Last Name</Label>
                      <Input
                        id="register-last-name"
                        data-testid="register-last-name-input"
                        value={registerForm.last_name}
                        onChange={(e) => setRegisterForm({ ...registerForm, last_name: e.target.value })}
                        placeholder="Last name"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="register-username">Username *</Label>
                    <Input
                      id="register-username"
                      data-testid="register-username-input"
                      value={registerForm.username}
                      onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="register-email">Email *</Label>
                    <Input
                      id="register-email"
                      data-testid="register-email-input"
                      type="email"
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="register-pillar">Pillar</Label>
                    <Select value={registerForm.pillar} onValueChange={(value) => setRegisterForm({ ...registerForm, pillar: value })}>
                      <SelectTrigger data-testid="register-pillar-select">
                        <SelectValue placeholder="Select Pillar" />
                      </SelectTrigger>
                      <SelectContent>
                        {pillars.map((pillar) => (
                          <SelectItem key={pillar.id} value={pillar.name}>{pillar.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {registerForm.pillar && (
                    <div>
                      <Label htmlFor="register-department">Department</Label>
                      <Select value={registerForm.department} onValueChange={(value) => setRegisterForm({ ...registerForm, department: value })}>
                        <SelectTrigger data-testid="register-department-select">
                          <SelectValue placeholder="Select Department" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredDepartments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {registerForm.department && (
                    <div>
                      <Label htmlFor="register-team">Team</Label>
                      <Select value={registerForm.team} onValueChange={(value) => setRegisterForm({ ...registerForm, team: value })}>
                        <SelectTrigger data-testid="register-team-select">
                          <SelectValue placeholder="Select Team" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredTeams.map((team) => (
                            <SelectItem key={team.id} value={team.name}>{team.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="register-manager">Manager's Full Name *</Label>
                    <Input
                      id="register-manager"
                      data-testid="register-manager-input"
                      value={registerForm.manager}
                      onChange={(e) => setRegisterForm({ ...registerForm, manager: e.target.value })}
                      placeholder="Enter manager's full name"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="register-password">Password *</Label>
                    <Input
                      id="register-password"
                      data-testid="register-password-input"
                      type="password"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="register-confirm-password">Confirm Password *</Label>
                    <Input
                      id="register-confirm-password"
                      data-testid="register-confirm-password-input"
                      type="password"
                      value={registerForm.confirmPassword}
                      onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    data-testid="register-submit-btn"
                    className="w-full bg-blue-700 hover:bg-blue-800"
                    disabled={loading}
                  >
                    {loading ? 'Registering...' : 'Register'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
