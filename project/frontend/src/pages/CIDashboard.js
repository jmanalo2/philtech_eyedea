import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { toast } from 'sonner';
import { 
  Zap, Award, TrendingUp, DollarSign, Clock, Download, 
  BarChart3, PieChart as PieChartIcon, Lightbulb, Users, CalendarIcon, CheckCircle, Wrench
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#EC4899'];

export default function CIDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, [startDate, endDate]);

  const fetchAnalytics = async () => {
    try {
      const params = {};
      if (startDate) params.start_date = format(startDate, 'yyyy-MM-dd');
      if (endDate) params.end_date = format(endDate, 'yyyy-MM-dd');
      
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/dashboard/analytics`, { params });
      setAnalytics(response.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const clearDateFilter = () => {
    setStartDate(null);
    setEndDate(null);
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/dashboard/export-excel`,
        { responseType: 'blob' }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'philtech_eyedeas.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Excel file downloaded successfully!');
    } catch (error) {
      toast.error('Failed to export Excel file');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading analytics...</div>
      </div>
    );
  }

  const statsCards = [
    {
      title: 'Quick Wins',
      value: analytics?.quick_wins_count || 0,
      icon: Zap,
      color: 'bg-green-500',
      textColor: 'text-green-600',
      description: 'Ideas implemented quickly'
    },
    {
      title: 'Implemented',
      value: analytics?.implemented_count || 0,
      icon: CheckCircle,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-600',
      description: `Rate: ${analytics?.implementation_rate || 0}%`
    },
    {
      title: 'Assigned to T&E',
      value: analytics?.assigned_to_te_count || 0,
      icon: Wrench,
      color: 'bg-purple-500',
      textColor: 'text-purple-600',
      description: `Rate: ${analytics?.assigned_to_te_rate || 0}%`
    },
    {
      title: 'High Complexity',
      value: analytics?.complexity_counts?.high || 0,
      icon: Award,
      color: 'bg-red-500',
      textColor: 'text-red-600',
      description: 'Complex implementations'
    }
  ];

  const complexityData = analytics?.charts_data?.complexity_chart || [];
  const statusData = analytics?.charts_data?.status_chart || [];

  return (
    <div data-testid="ci-dashboard-page">
      {/* Header */}
      <div className="mb-8 flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">C.I. Excellence Dashboard</h1>
          <p className="text-gray-600">Analytics and insights for continuous improvement</p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          {/* Date Range Filter */}
          <div className="flex items-center gap-2 bg-white border rounded-lg p-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-[130px]">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {startDate ? format(startDate, 'MMM d, yyyy') : 'Start Date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
              </PopoverContent>
            </Popover>
            <span className="text-gray-500">to</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-[130px]">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {endDate ? format(endDate, 'MMM d, yyyy') : 'End Date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
              </PopoverContent>
            </Popover>
            {(startDate || endDate) && (
              <Button variant="ghost" size="sm" onClick={clearDateFilter}>Clear</Button>
            )}
          </div>
          <Button
            data-testid="export-excel-btn"
            onClick={handleExportExcel}
            disabled={exporting}
            className="bg-green-600 hover:bg-green-700"
          >
            <Download className="w-4 h-4 mr-2" />
            {exporting ? 'Exporting...' : 'Export to Excel'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow" data-testid={`ci-stat-${index}`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <div className={`${stat.color} p-2 rounded-lg`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${stat.textColor}`}>
                  {stat.value}
                </div>
                <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Savings Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="bg-green-600 p-3 rounded-lg">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-green-900">Total Cost Savings</CardTitle>
                <CardDescription>Estimated financial impact</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-green-700">
              ${(analytics?.total_cost_savings || 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-3 rounded-lg">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-blue-900">Total Time Saved</CardTitle>
                <CardDescription>Efficiency improvements</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-blue-700">
              {analytics?.total_time_saved?.hours || 0}h {analytics?.total_time_saved?.minutes || 0}m
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Complexity Distribution Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <PieChartIcon className="w-5 h-5 text-blue-600" />
              <CardTitle>Complexity Distribution</CardTitle>
            </div>
            <CardDescription>Breakdown of evaluated ideas by complexity</CardDescription>
          </CardHeader>
          <CardContent>
            {complexityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={complexityData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {complexityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No complexity data available yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Distribution Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-green-600" />
              <CardTitle>Status Distribution</CardTitle>
            </div>
            <CardDescription>Overview of all idea statuses</CardDescription>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill="#3B82F6" name="Count" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No status data available yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Rates Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Approval Rate</CardTitle>
            <CardDescription>Approved / (Total - Declined)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <div className="text-4xl font-bold text-blue-600">
                {analytics?.approval_rate || 0}%
              </div>
              <div className="flex-1">
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div 
                    className="bg-blue-600 h-4 rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(analytics?.approval_rate || 0, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Implementation Rate</CardTitle>
            <CardDescription>Implemented / (Total - Declined)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <div className="text-4xl font-bold text-emerald-600">
                {analytics?.implementation_rate || 0}%
              </div>
              <div className="flex-1">
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div 
                    className="bg-emerald-600 h-4 rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(analytics?.implementation_rate || 0, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Assigned to T&E Rate</CardTitle>
            <CardDescription>Assigned to T&E / (Total - Declined)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <div className="text-4xl font-bold text-purple-600">
                {analytics?.assigned_to_te_rate || 0}%
              </div>
              <div className="flex-1">
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div 
                    className="bg-purple-600 h-4 rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(analytics?.assigned_to_te_rate || 0, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Best Idea Section */}
      {analytics?.best_idea && (
        <Card className="bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-300">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="bg-yellow-500 p-3 rounded-lg">
                <Award className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-yellow-900">Best Eye-dea</CardTitle>
                <CardDescription>Selected by the C.I. Excellence Team</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-white p-6 rounded-lg border border-yellow-200">
              <div className="flex items-start justify-between">
                <div>
                  <Badge className="bg-yellow-500 mb-2">{analytics.best_idea.idea_number}</Badge>
                  <h3 className="text-xl font-bold text-gray-900">{analytics.best_idea.title}</h3>
                  <p className="text-gray-600 mt-2">{analytics.best_idea.benefits}</p>
                </div>
                <Lightbulb className="w-12 h-12 text-yellow-500" />
              </div>
              <div className="mt-4 pt-4 border-t border-yellow-200 flex items-center space-x-4 text-sm text-gray-600">
                <span>Submitted by: {analytics.best_idea.submitted_by_username}</span>
                <span>•</span>
                <span>Pillar: {analytics.best_idea.pillar}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
