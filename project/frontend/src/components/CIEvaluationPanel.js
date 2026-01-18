import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Users, DollarSign, Clock, Award, Star } from 'lucide-react';

export default function CIEvaluationPanel({ idea, onEvaluationComplete }) {
  const [step, setStep] = useState(1);
  const [techPersons, setTechPersons] = useState([]);
  const [markingBest, setMarkingBest] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [evaluation, setEvaluation] = useState({
    is_quick_win: null,
    complexity_level: null,
    savings_type: null,
    cost_savings: null,
    time_saved_hours: null,
    time_saved_minutes: null,
    evaluation_notes: '',
    assigned_to_tech: false,
    tech_person_name: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTechPersons();
  }, []);

  const fetchTechPersons = async () => {
    try {
      const response = await api.get('/api/admin/tech-persons');
      setTechPersons(response.data);
    } catch (error) {
      console.error('Failed to fetch tech persons:', error);
    }
  };

  const handleMarkAsBestIdea = async () => {
    setMarkingBest(true);
    try {
      await api.post(`/api/ideas/${idea.id}/mark-best-idea`);
      toast.success('This Eye-dea has been marked as the Best Eye-dea!');
      onEvaluationComplete();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to mark as best idea');
    } finally {
      setMarkingBest(false);
    }
  };

  const handleQuickWinSelection = (isQuickWin) => {
    setEvaluation({ ...evaluation, is_quick_win: isQuickWin });
    setStep(2);
  };

  const handleComplexitySelection = (complexity) => {
    setEvaluation({ ...evaluation, complexity_level: complexity });
    setStep(3);
  };

  const handleImplemented = async () => {
    setSubmitting(true);
    try {
      await api.post(`/api/ideas/${idea.id}/ci-evaluate`, {
        is_quick_win: true,
        complexity_level: null,
        savings_type: null,
        cost_savings: null,
        time_saved_hours: null,
        time_saved_minutes: null,
        evaluation_notes: 'Marked as Quick Win - Idea Implemented',
        assigned_to_tech: false,
        tech_person_name: null
      });
      toast.success('Idea marked as Quick Win and Implemented!');
      onEvaluationComplete();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save evaluation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitEvaluation = async () => {
    if (!evaluation.complexity_level) {
      toast.error('Please select complexity level');
      return;
    }

    if (evaluation.assigned_to_tech && !evaluation.tech_person_name.trim()) {
      toast.error('Please enter tech person name');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/api/ideas/${idea.id}/ci-evaluate`, evaluation);
      toast.success('Evaluation saved successfully!');
      onEvaluationComplete();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save evaluation');
    } finally {
      setSubmitting(false);
    }
  };

  // Check if already evaluated
  if (idea.is_quick_win !== null && idea.is_quick_win !== undefined) {
    return (
      <Card className="bg-green-50 border-green-200">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-green-900 flex items-center">
                <CheckCircle className="w-5 h-5 mr-2" />
                Already Evaluated
                {idea.is_best_idea && (
                  <Badge className="ml-3 bg-yellow-500 text-white">
                    <Star className="w-3 h-3 mr-1" /> Best Eye-dea
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>This Eye-dea has been evaluated by the C.I. Excellence Team</CardDescription>
            </div>
            {!idea.is_best_idea && (
              <Button
                data-testid="mark-best-idea-btn"
                onClick={handleMarkAsBestIdea}
                disabled={markingBest}
                className="bg-yellow-500 hover:bg-yellow-600 text-white"
              >
                <Award className="w-4 h-4 mr-2" />
                {markingBest ? 'Marking...' : 'Mark as Best Eye-dea'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <span className="font-semibold text-gray-700">Quick Win:</span>
              <Badge className={`ml-2 ${idea.is_quick_win ? 'bg-green-600' : 'bg-yellow-600'}`}>
                {idea.is_quick_win ? 'Yes' : 'No'}
              </Badge>
            </div>
            {!idea.is_quick_win && idea.complexity_level && (
              <>
                <div>
                  <span className="font-semibold text-gray-700">Complexity:</span>
                  <Badge className="ml-2 bg-blue-600">{idea.complexity_level}</Badge>
                </div>
                {idea.savings_type && (
                  <div>
                    <span className="font-semibold text-gray-700">Savings Type:</span>
                    <span className="ml-2 text-gray-900">
                      {idea.savings_type === 'cost_savings' ? 'Cost Savings' : 'Time Saved'}
                    </span>
                  </div>
                )}
                {idea.cost_savings && (
                  <div>
                    <span className="font-semibold text-gray-700">Cost Savings:</span>
                    <span className="ml-2 text-gray-900">${idea.cost_savings.toLocaleString()}</span>
                  </div>
                )}
                {(idea.time_saved_hours || idea.time_saved_minutes) && (
                  <div>
                    <span className="font-semibold text-gray-700">Time Saved:</span>
                    <span className="ml-2 text-gray-900">
                      {idea.time_saved_hours || 0}h {idea.time_saved_minutes || 0}m
                    </span>
                  </div>
                )}
                {idea.tech_person_name && (
                  <div>
                    <span className="font-semibold text-gray-700">Assigned to:</span>
                    <span className="ml-2 text-gray-900">{idea.tech_person_name} (T&E Team)</span>
                  </div>
                )}
              </>
            )}
            {idea.evaluated_by_username && (
              <div className="pt-3 border-t border-green-300">
                <span className="text-sm text-gray-600">Evaluated by: {idea.evaluated_by_username}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-blue-50 border-blue-300 border-2">
      <CardHeader>
        <CardTitle className="text-blue-900">C.I. Excellence Team Evaluation</CardTitle>
        <CardDescription>Evaluate and validate this approved Eye-dea</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Step 1: Quick Wins Question */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg border-2 border-blue-200">
              <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">Is this a Quick Win?</h3>
              <p className="text-gray-600 text-center mb-6">
                Can this idea be implemented quickly with immediate benefits?
              </p>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  data-testid="quick-win-yes-btn"
                  onClick={() => handleQuickWinSelection(true)}
                  className="h-24 text-xl bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-8 h-8 mr-3" />
                  Yes - Quick Win
                </Button>
                <Button
                  data-testid="quick-win-no-btn"
                  onClick={() => handleQuickWinSelection(false)}
                  className="h-24 text-xl bg-orange-600 hover:bg-orange-700"
                >
                  <XCircle className="w-8 h-8 mr-3" />
                  No - Needs Analysis
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2a: If Quick Win - Mark as Implemented */}
        {step === 2 && evaluation.is_quick_win && (
          <div className="space-y-6">
            <div className="bg-green-50 p-6 rounded-lg border-2 border-green-300">
              <h3 className="text-xl font-bold text-green-900 mb-4">
                ✓ Quick Win Confirmed
              </h3>
              <p className="text-gray-700 mb-6">
                This Eye-dea has been identified as a Quick Win. Mark it as implemented to complete the evaluation.
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={() => setStep(1)}
                  variant="outline"
                  data-testid="back-to-quick-win-btn"
                >
                  Back
                </Button>
                <Button
                  data-testid="mark-implemented-btn"
                  onClick={handleImplemented}
                  disabled={submitting}
                  className="bg-green-600 hover:bg-green-700 flex-1"
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  {submitting ? 'Saving...' : 'Mark as Implemented'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2b: If Not Quick Win - Select Complexity */}
        {step === 2 && !evaluation.is_quick_win && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg border-2 border-orange-200">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Select Complexity Level</h3>
              <p className="text-gray-600 mb-6">
                Based on your analysis, how complex is the implementation of this Eye-dea?
              </p>
              <div className="grid grid-cols-3 gap-4">
                <Button
                  data-testid="complexity-low-btn"
                  onClick={() => handleComplexitySelection('Low')}
                  className="h-32 flex-col bg-green-600 hover:bg-green-700"
                >
                  <span className="text-3xl mb-2">●</span>
                  <span className="text-lg font-bold">Low</span>
                  <span className="text-xs mt-1">Simple to implement</span>
                </Button>
                <Button
                  data-testid="complexity-medium-btn"
                  onClick={() => handleComplexitySelection('Medium')}
                  className="h-32 flex-col bg-yellow-600 hover:bg-yellow-700"
                >
                  <span className="text-3xl mb-2">●●</span>
                  <span className="text-lg font-bold">Medium</span>
                  <span className="text-xs mt-1">Moderate effort</span>
                </Button>
                <Button
                  data-testid="complexity-high-btn"
                  onClick={() => handleComplexitySelection('High')}
                  className="h-32 flex-col bg-red-600 hover:bg-red-700"
                >
                  <span className="text-3xl mb-2">●●●</span>
                  <span className="text-lg font-bold">High</span>
                  <span className="text-xs mt-1">Complex implementation</span>
                </Button>
              </div>
              <div className="mt-4">
                <Button onClick={() => setStep(1)} variant="outline" size="sm">
                  Back
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Additional Details & Tech Assignment */}
        {step === 3 && !evaluation.is_quick_win && (
          <div className="space-y-6">
            <div className="bg-blue-100 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-blue-900">Complexity Level:</span>
                <Badge className="bg-blue-600">{evaluation.complexity_level}</Badge>
              </div>
            </div>

            {/* Savings Type Selection */}
            <div>
              <Label className="text-base font-semibold mb-3 block">Impact Type</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setEvaluation({ ...evaluation, savings_type: 'cost_savings' })}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    evaluation.savings_type === 'cost_savings'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-300 hover:border-green-300'
                  }`}
                >
                  <DollarSign className="w-6 h-6 text-green-600 mb-2" />
                  <div className="font-semibold">Cost Savings</div>
                  <div className="text-xs text-gray-600">Financial impact</div>
                </button>
                <button
                  onClick={() => setEvaluation({ ...evaluation, savings_type: 'time_saved' })}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    evaluation.savings_type === 'time_saved'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-blue-300'
                  }`}
                >
                  <Clock className="w-6 h-6 text-blue-600 mb-2" />
                  <div className="font-semibold">Time Saved</div>
                  <div className="text-xs text-gray-600">Efficiency gain</div>
                </button>
              </div>
            </div>

            {/* Cost Savings Input */}
            {evaluation.savings_type === 'cost_savings' && (
              <div>
                <Label htmlFor="cost-savings">Estimated Cost Savings ($)</Label>
                <Input
                  id="cost-savings"
                  type="number"
                  placeholder="e.g., 5000"
                  value={evaluation.cost_savings || ''}
                  onChange={(e) => setEvaluation({ ...evaluation, cost_savings: parseFloat(e.target.value) })}
                />
              </div>
            )}

            {/* Time Saved Input */}
            {evaluation.savings_type === 'time_saved' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="time-hours">Hours Saved</Label>
                  <Input
                    id="time-hours"
                    type="number"
                    placeholder="Hours"
                    value={evaluation.time_saved_hours || ''}
                    onChange={(e) => setEvaluation({ ...evaluation, time_saved_hours: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="time-minutes">Minutes Saved</Label>
                  <Input
                    id="time-minutes"
                    type="number"
                    placeholder="Minutes"
                    value={evaluation.time_saved_minutes || ''}
                    onChange={(e) => setEvaluation({ ...evaluation, time_saved_minutes: parseFloat(e.target.value) })}
                  />
                </div>
              </div>
            )}

            {/* Evaluation Notes */}
            <div>
              <Label htmlFor="eval-notes">Evaluation Notes (Optional)</Label>
              <Textarea
                id="eval-notes"
                placeholder="Add any additional notes about this evaluation..."
                rows={3}
                value={evaluation.evaluation_notes}
                onChange={(e) => setEvaluation({ ...evaluation, evaluation_notes: e.target.value })}
              />
            </div>

            {/* Assign to T&E Team Button */}
            <div className="border-t pt-6">
              {!evaluation.assigned_to_tech ? (
                <Button
                  data-testid="assign-to-te-btn"
                  onClick={() => setEvaluation({ ...evaluation, assigned_to_tech: true })}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  <Users className="w-5 h-5 mr-2" />
                  Assign to T&E Team
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="bg-purple-50 p-3 rounded-lg border border-purple-300">
                    <span className="text-sm font-semibold text-purple-900">Assigning to T&E Team</span>
                  </div>
                  <div>
                    <Label htmlFor="tech-person">Select Tech Person</Label>
                    <Select 
                      value={evaluation.tech_person_name} 
                      onValueChange={(value) => setEvaluation({ ...evaluation, tech_person_name: value })}
                    >
                      <SelectTrigger data-testid="tech-person-select">
                        <SelectValue placeholder="Select a tech person" />
                      </SelectTrigger>
                      <SelectContent>
                        {techPersons.map((person) => (
                          <SelectItem key={person.id} value={person.name}>
                            {person.name} {person.specialization ? `(${person.specialization})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={() => setEvaluation({ ...evaluation, assigned_to_tech: false, tech_person_name: '' })}
                    variant="outline"
                    size="sm"
                  >
                    Cancel Assignment
                  </Button>
                </div>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={() => setStep(2)}
                variant="outline"
              >
                Back
              </Button>
              <Button
                data-testid="submit-evaluation-btn"
                onClick={handleSubmitEvaluation}
                disabled={submitting}
                className="flex-1 bg-blue-700 hover:bg-blue-800"
              >
                {submitting ? 'Saving...' : 'Submit Evaluation'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}