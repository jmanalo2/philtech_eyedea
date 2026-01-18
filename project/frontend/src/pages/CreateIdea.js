import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { toast } from 'sonner';
import { ArrowLeft, Save, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

export default function CreateIdea() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [pillars, setPillars] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [filteredTeams, setFilteredTeams] = useState([]);

  const [formData, setFormData] = useState({
    pillar: '',
    title: '',
    improvement_type: '',
    current_process: '',
    suggested_solution: '',
    benefits: '',
    target_completion: null,
    department: '',
    team: '',
    manager: ''
  });

  const improvementTypes = [
    'Standardization',
    'Automation',
    'Compliance',
    'Process Simplification',
    'Cost Efficiency',
    'Cycle Time Reduction',
    'Accuracy Improvement',
    'Customer Experience',
    'Risk Reduction',
    'Data Quality'
  ];

  useEffect(() => {
    fetchDropdownData();
    // Auto-populate from user profile if creating new idea
    if (!id && user) {
      setFormData(prev => ({
        ...prev,
        pillar: user.pillar || '',
        department: user.department || '',
        team: user.team || '',
        manager: user.manager || ''
      }));
    }
    if (id) {
      fetchIdea();
    }
  }, [id, user]);

  useEffect(() => {
    if (formData.pillar) {
      const filtered = teams.filter(team => team.pillar === formData.pillar);
      setFilteredTeams(filtered);
    } else {
      setFilteredTeams([]);
    }
  }, [formData.pillar, teams]);

  const fetchDropdownData = async () => {
    try {
      const [pillarsRes, deptsRes, teamsRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/admin/pillars`),
        axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/admin/departments`),
        axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/admin/teams`)
      ]);
      setPillars(pillarsRes.data);
      setDepartments(deptsRes.data);
      setTeams(teamsRes.data);
    } catch (error) {
      console.error('Failed to fetch dropdown data:', error);
    }
  };

  const fetchIdea = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/ideas/${id}`);
      setFormData({
        pillar: response.data.pillar,
        title: response.data.title,
        improvement_type: response.data.improvement_type,
        current_process: response.data.current_process,
        suggested_solution: response.data.suggested_solution,
        benefits: response.data.benefits,
        target_completion: response.data.target_completion ? new Date(response.data.target_completion) : null,
        department: response.data.department || '',
        team: response.data.team || '',
        manager: response.data.manager || ''
      });
    } catch (error) {
      console.error('Failed to fetch idea:', error);
      toast.error('Failed to load Eye-dea');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const submitData = {
        ...formData,
        target_completion: formData.target_completion ? format(formData.target_completion, 'yyyy-MM-dd') : ''
      };
      
      if (id) {
        await axios.put(`${process.env.REACT_APP_BACKEND_URL}/api/ideas/${id}`, submitData);
        toast.success('Eye-dea updated successfully!');
      } else {
        await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/ideas`, submitData);
        toast.success('Eye-dea submitted successfully!');
      }
      navigate('/ideas');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save Eye-dea');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <div data-testid="create-idea-page">
      <Button
        data-testid="back-btn"
        variant="ghost"
        className="mb-6"
        onClick={() => navigate('/ideas')}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Eye-deas
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{id ? 'Edit Eye-dea' : 'Submit New Eye-dea'}</CardTitle>
          <CardDescription>
            {id ? 'Update your Eye-dea details' : 'Share your innovative idea with the team'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="pillar">Pillar *</Label>
                <Select value={formData.pillar} onValueChange={(value) => handleChange('pillar', value)} required>
                  <SelectTrigger data-testid="pillar-select">
                    <SelectValue placeholder="Select Pillar" />
                  </SelectTrigger>
                  <SelectContent>
                    {pillars.map((pillar) => (
                      <SelectItem key={pillar.id} value={pillar.name}>{pillar.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="improvement_type">Improvement Type *</Label>
                <Select value={formData.improvement_type} onValueChange={(value) => handleChange('improvement_type', value)} required>
                  <SelectTrigger data-testid="improvement-type-select">
                    <SelectValue placeholder="Select Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {improvementTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="department">Department</Label>
                <Select value={formData.department} onValueChange={(value) => handleChange('department', value)}>
                  <SelectTrigger data-testid="department-select">
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
                <Label htmlFor="team">Team</Label>
                <Select value={formData.team} onValueChange={(value) => handleChange('team', value)} disabled={!formData.pillar}>
                  <SelectTrigger data-testid="team-select">
                    <SelectValue placeholder={formData.pillar ? 'Select Team' : 'Select Pillar first'} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredTeams.map((team) => (
                      <SelectItem key={team.id} value={team.name}>{team.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="title">Eye-dea Title *</Label>
                <Input
                  id="title"
                  data-testid="title-input"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="Brief, descriptive title"
                  required
                />
              </div>

              <div>
                <Label htmlFor="target_completion">Target Completion Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      data-testid="target-completion-input"
                      className={`w-full justify-start text-left font-normal ${!formData.target_completion && 'text-muted-foreground'}`}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.target_completion ? format(formData.target_completion, 'PPP') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.target_completion}
                      onSelect={(date) => handleChange('target_completion', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label htmlFor="manager">Manager</Label>
                <Input
                  id="manager"
                  data-testid="manager-input"
                  value={formData.manager}
                  onChange={(e) => handleChange('manager', e.target.value)}
                  placeholder="Manager's name"
                  disabled={!!user?.manager}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="current_process">Current Process *</Label>
              <Textarea
                id="current_process"
                data-testid="current-process-input"
                value={formData.current_process}
                onChange={(e) => handleChange('current_process', e.target.value)}
                placeholder="Describe the current process or situation"
                rows={4}
                required
              />
            </div>

            <div>
              <Label htmlFor="suggested_solution">Suggested Solution *</Label>
              <Textarea
                id="suggested_solution"
                data-testid="suggested-solution-input"
                value={formData.suggested_solution}
                onChange={(e) => handleChange('suggested_solution', e.target.value)}
                placeholder="Describe your proposed solution"
                rows={4}
                required
              />
            </div>

            <div>
              <Label htmlFor="benefits">Benefits *</Label>
              <Textarea
                id="benefits"
                data-testid="benefits-input"
                value={formData.benefits}
                onChange={(e) => handleChange('benefits', e.target.value)}
                placeholder="Describe the expected benefits and impact"
                rows={4}
                required
              />
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                data-testid="cancel-btn"
                variant="outline"
                onClick={() => navigate('/ideas')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                data-testid="submit-btn"
                className="bg-blue-700 hover:bg-blue-800"
                disabled={loading}
              >
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Saving...' : id ? 'Update Eye-dea' : 'Submit Eye-dea'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}