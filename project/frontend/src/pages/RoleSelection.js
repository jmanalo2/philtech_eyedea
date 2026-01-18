import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { Lightbulb, CheckCircle, Users } from 'lucide-react';

export default function RoleSelection() {
  const navigate = useNavigate();
  const [selecting, setSelecting] = useState(false);

  const handleRoleSelect = async (subRole) => {
    setSelecting(true);
    try {
      await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/auth/set-sub-role`, {
        sub_role: subRole
      });
      
      toast.success(`Role selected: ${subRole === 'approver' ? 'Approver' : 'C.I. Excellence Team'}`);
      
      // Refresh user data
      window.location.href = '/dashboard';
    } catch (error) {
      toast.error('Failed to set role');
      setSelecting(false);
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
          <p className="text-gray-600">Select Your Role</p>
        </div>

        <Card className="shadow-xl border-0 mb-6">
          <CardHeader>
            <CardTitle>Welcome, Approver!</CardTitle>
            <CardDescription>
              Please select your role to continue. This will determine your access and responsibilities.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Approver Role */}
              <button
                data-testid="select-approver-role"
                onClick={() => handleRoleSelect('approver')}
                disabled={selecting}
                className="p-8 border-2 border-blue-200 rounded-xl hover:border-blue-500 hover:shadow-lg transition-all duration-200 text-left group disabled:opacity-50"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-500 transition-colors">
                    <CheckCircle className="w-8 h-8 text-blue-600 group-hover:text-white" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Approver</h3>
                <p className="text-gray-600 mb-4">
                  Review and make decisions on submitted Eye-deas
                </p>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                    Approve Eye-deas
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                    Decline Eye-deas
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                    Request Revisions
                  </li>
                </ul>
              </button>

              {/* C.I. Excellence Team Role */}
              <button
                data-testid="select-ci-excellence-role"
                onClick={() => handleRoleSelect('ci_excellence')}
                disabled={selecting}
                className="p-8 border-2 border-green-200 rounded-xl hover:border-green-500 hover:shadow-lg transition-all duration-200 text-left group disabled:opacity-50"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-500 transition-colors">
                    <Users className="w-8 h-8 text-green-600 group-hover:text-white" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">C.I. Excellence Team</h3>
                <p className="text-gray-600 mb-4">
                  Evaluate and validate approved Eye-deas
                </p>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    Tag as Quick Wins
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    Assign Complexity Level
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    Track Cost & Time Savings
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    Assign to Tech Team
                  </li>
                </ul>
              </button>
            </div>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> You can change your role selection later from your profile settings.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}