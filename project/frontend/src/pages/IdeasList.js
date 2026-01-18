import React, { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Plus, Filter, AlertCircle, Star } from 'lucide-react';
import { format } from 'date-fns';

export default function IdeasList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pillars, setPillars] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [teams, setTeams] = useState([]);

  const [filters, setFilters] = useState({
    status: searchParams.get('status') || '',
    pillar: searchParams.get('pillar') || '',
    department: searchParams.get('department') || '',
    team: searchParams.get('team') || ''
  });

  useEffect(() => {
    fetchIdeas();
    fetchFilterData();
  }, [filters]);

  // Note: Removed auto-filter for C.I. Excellence Team - they can manually select status filter

  const fetchIdeas = async () => {
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.pillar) params.pillar = filters.pillar;
      if (filters.department) params.department = filters.department;
      if (filters.team) params.team = filters.team;

      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/ideas`, { params });
      setIdeas(response.data);
    } catch (error) {
      console.error('Failed to fetch ideas:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilterData = async () => {
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
      console.error('Failed to fetch filter data:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    // Handle "all" selection by clearing the filter
    const actualValue = value === ' ' ? '' : value;
    const newFilters = { ...filters, [key]: actualValue };
    setFilters(newFilters);
    
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    setSearchParams(params);
  };

  const clearFilters = () => {
    setFilters({ status: '', pillar: '', department: '', team: '' });
    setSearchParams({});
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: { variant: 'default', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
      approved: { variant: 'default', className: 'bg-green-100 text-green-800 border-green-300' },
      implemented: { variant: 'default', className: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
      assigned_to_te: { variant: 'default', className: 'bg-purple-100 text-purple-800 border-purple-300' },
      declined: { variant: 'default', className: 'bg-red-100 text-red-800 border-red-300' },
      revision_requested: { variant: 'default', className: 'bg-orange-100 text-orange-800 border-orange-300' }
    };
    return variants[status] || {};
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pending',
      approved: 'Approved',
      implemented: 'Implemented',
      assigned_to_te: 'Assigned to T&E',
      declined: 'Declined',
      revision_requested: 'Revision Requested'
    };
    return labels[status] || status;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div data-testid="ideas-list-page">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Eye-deas</h1>
          <p className="text-gray-600">Browse and manage organizational ideas</p>
        </div>
        <Link to="/ideas/new">
          <Button data-testid="create-idea-btn" className="bg-blue-700 hover:bg-blue-800">
            <Plus className="w-4 h-4 mr-2" />
            New Eye-dea
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-600" />
              <CardTitle>Filters</CardTitle>
            </div>
            <Button
              data-testid="clear-filters-btn"
              variant="outline"
              size="sm"
              onClick={clearFilters}
            >
              Clear Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Status</label>
              <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                <SelectTrigger data-testid="filter-status">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=" ">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="implemented">Implemented</SelectItem>
                  <SelectItem value="assigned_to_te">Assigned to T&E</SelectItem>
                  <SelectItem value="revision_requested">Revision Requested</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Pillar</label>
              <Select value={filters.pillar} onValueChange={(value) => handleFilterChange('pillar', value)}>
                <SelectTrigger data-testid="filter-pillar">
                  <SelectValue placeholder="All Pillars" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=" ">All Pillars</SelectItem>
                  {pillars.map((pillar) => (
                    <SelectItem key={pillar.id} value={pillar.name}>{pillar.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Department</label>
              <Select value={filters.department} onValueChange={(value) => handleFilterChange('department', value)}>
                <SelectTrigger data-testid="filter-department">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=" ">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Team</label>
              <Select value={filters.team} onValueChange={(value) => handleFilterChange('team', value)}>
                <SelectTrigger data-testid="filter-team">
                  <SelectValue placeholder="All Teams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=" ">All Teams</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.name}>{team.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ideas List */}
      <div className="space-y-4">
        {ideas.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">No Eye-deas found. Be the first to submit one!</p>
            </CardContent>
          </Card>
        ) : (
          ideas.map((idea) => {
            const needsRevision = idea.status === 'revision_requested' && idea.submitted_by === user?.id;
            const isBestIdea = idea.is_best_idea;
            return (
              <div 
                key={idea.id} 
                onClick={() => navigate(`/ideas/${idea.id}`, { state: { filters: searchParams.toString() } })}
                className="cursor-pointer"
              >
                <Card 
                  className={`hover:shadow-lg transition-all duration-200 ${
                    isBestIdea ? 'border-2 border-yellow-400 bg-yellow-50' :
                    needsRevision ? 'border-2 border-orange-400 bg-orange-50' : ''
                  }`} 
                  data-testid={`idea-card-${idea.id}`}
                >
                  {isBestIdea && (
                    <div className="bg-yellow-400 text-yellow-900 px-4 py-2 flex items-center space-x-2 rounded-t-lg">
                      <Star className="w-5 h-5" />
                      <span className="font-bold">BEST EYE-DEA</span>
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <CardTitle className="text-xl">{idea.title}</CardTitle>
                          <Badge {...getStatusBadge(idea.status)} data-testid={`idea-status-${idea.id}`}>
                            {getStatusLabel(idea.status)}
                          </Badge>
                          {needsRevision && (
                            <Badge className="bg-orange-600 text-white animate-pulse">
                              Action Required
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="flex items-center space-x-4 text-sm">
                          <span className="font-semibold">{idea.idea_number}</span>
                          <span>•</span>
                          <span>{idea.pillar}</span>
                          {idea.department && (
                            <>
                              <span>•</span>
                              <span>{idea.department}</span>
                            </>
                          )}
                          {idea.team && (
                            <>
                              <span>•</span>
                              <span>{idea.team}</span>
                            </>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Improvement Type:</span>
                        <span className="ml-2 text-gray-600">{idea.improvement_type}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Target Completion:</span>
                        <span className="ml-2 text-gray-600">{idea.target_completion}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Submitted By:</span>
                        <span className="ml-2 text-gray-600">{idea.submitted_by_username}</span>
                      </div>
                      {idea.assigned_approver_username && (
                        <div>
                          <span className="font-medium text-gray-700">Approver:</span>
                          <span className="ml-2 text-gray-600">{idea.assigned_approver_username}</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-4">
                      <p className="text-gray-700 line-clamp-2">{idea.suggested_solution}</p>
                    </div>
                    {needsRevision && (
                      <div className="mt-4 flex items-center space-x-2 text-orange-700 font-medium">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm">Revision requested - Click to view comments and resubmit</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}