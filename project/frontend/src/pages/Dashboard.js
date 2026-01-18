import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { TrendingUp, CheckCircle2, XCircle, AlertCircle, Clock, Lightbulb, Award, Wrench, Star } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/dashboard/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  const statCards = [
    {
      title: 'Total Eye-deas',
      value: stats?.total_ideas || 0,
      icon: Lightbulb,
      color: 'bg-blue-500',
      textColor: 'text-blue-600',
      link: '/ideas'
    },
    {
      title: 'Pending Review',
      value: stats?.pending_ideas || 0,
      icon: Clock,
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600',
      link: '/ideas?status=pending'
    },
    {
      title: 'Approved',
      value: stats?.approved_ideas || 0,
      icon: CheckCircle2,
      color: 'bg-green-500',
      textColor: 'text-green-600',
      link: '/ideas?status=approved'
    },
    {
      title: 'Implemented',
      value: stats?.implemented_ideas || 0,
      icon: Award,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-600',
      link: '/ideas?status=implemented'
    },
    {
      title: 'Assigned to T&E',
      value: stats?.assigned_to_te_ideas || 0,
      icon: Wrench,
      color: 'bg-purple-500',
      textColor: 'text-purple-600',
      link: '/ideas?status=assigned_to_te'
    },
    {
      title: 'Revision Requested',
      value: stats?.revision_requested_ideas || 0,
      icon: AlertCircle,
      color: 'bg-orange-500',
      textColor: 'text-orange-600',
      link: '/ideas?status=revision_requested'
    },
    {
      title: 'Declined',
      value: stats?.declined_ideas || 0,
      icon: XCircle,
      color: 'bg-red-500',
      textColor: 'text-red-600',
      link: '/ideas?status=declined'
    },
    {
      title: 'My Submissions',
      value: stats?.my_ideas || 0,
      icon: TrendingUp,
      color: 'bg-indigo-500',
      textColor: 'text-indigo-600',
      link: '/ideas'
    }
  ];

  return (
    <div data-testid="dashboard-page">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome back, {user?.username}!</h1>
        <p className="text-gray-600">Here's an overview of your Eye-dea management system</p>
      </div>

      {/* Best Eye-dea Banner */}
      {stats?.best_idea && (
        <Link to={`/ideas/${stats.best_idea.id}`}>
          <Card className="mb-8 bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-300 hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="bg-yellow-500 p-3 rounded-full">
                    <Star className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <Badge className="bg-yellow-500 text-white">Best Eye-dea</Badge>
                      <span className="text-sm text-gray-600">{stats.best_idea.idea_number}</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mt-1">{stats.best_idea.title}</h3>
                    <p className="text-sm text-gray-600">Submitted by {stats.best_idea.submitted_by_username} • {stats.best_idea.pillar}</p>
                  </div>
                </div>
                <div className="text-right hidden md:block">
                  <p className="text-sm text-gray-500">Click to view details</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Link key={index} to={stat.link}>
              <Card className="hover:shadow-lg transition-shadow duration-300 cursor-pointer h-full" data-testid={`stat-card-${index}`}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-medium text-gray-600">
                    {stat.title}
                  </CardTitle>
                  <div className={`${stat.color} p-2 rounded-lg`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${stat.textColor}`}>
                    {stat.value}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Get started with managing your Eye-deas</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/ideas/new"
              data-testid="quick-action-new-idea"
              className="p-6 bg-blue-50 hover:bg-blue-100 rounded-lg border-2 border-blue-200 transition-colors duration-200 cursor-pointer"
            >
              <Lightbulb className="w-8 h-8 text-blue-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1">Submit New Eye-dea</h3>
              <p className="text-sm text-gray-600">Share your innovative ideas</p>
            </a>
            <a
              href="/ideas"
              data-testid="quick-action-view-ideas"
              className="p-6 bg-green-50 hover:bg-green-100 rounded-lg border-2 border-green-200 transition-colors duration-200 cursor-pointer"
            >
              <TrendingUp className="w-8 h-8 text-green-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1">View All Eye-deas</h3>
              <p className="text-sm text-gray-600">Browse submitted ideas</p>
            </a>
            {(user?.role === 'approver' || user?.role === 'admin') && (
              <a
                href="/ideas?status=pending"
                data-testid="quick-action-pending"
                className="p-6 bg-yellow-50 hover:bg-yellow-100 rounded-lg border-2 border-yellow-200 transition-colors duration-200 cursor-pointer"
              >
                <Clock className="w-8 h-8 text-yellow-600 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-1">Review Pending</h3>
                <p className="text-sm text-gray-600">Eye-deas awaiting approval</p>
              </a>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}