import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Spinner, Alert, ProgressBar, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChartBar,
  faTrophy,
  faArrowUp,
  faArrowDown,
  faExclamationTriangle,
  faCheckCircle,
  faClock,
  faEye
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';

const EvaluationAnalyticsSection = () => {
  const [loading, setLoading] = useState(true);
  const [evaluationData, setEvaluationData] = useState({
    recentEvaluations: [],
    averageScore: 0,
    totalEvaluations: 0,
    performanceTrend: 'stable',
    strengths: [],
    areasForImprovement: [],
    lastEvaluationDate: null
  });

  useEffect(() => {
    loadEvaluationData();
  }, []);

  const loadEvaluationData = async () => {
    try {
      setLoading(true);
      
      const response = await axios.get('/manager-evaluations/employee/me/results', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      const evaluations = response.data?.data || [];
      
      if (evaluations.length > 0) {
        // Calculate average score
        const totalScore = evaluations.reduce((sum, evaluation) => {
          const score = evaluation.scores?.average_score || evaluation.total_score || 0;
          return sum + score;
        }, 0);
        const averageScore = totalScore / evaluations.length;

        // Get latest evaluation for detailed analysis
        const latestEvaluation = evaluations[0];
        const strengths = latestEvaluation.analysis?.strengths || [];
        const weaknesses = latestEvaluation.analysis?.weaknesses || [];

        // Determine performance trend
        let performanceTrend = 'stable';
        if (evaluations.length >= 2) {
          const currentScore = evaluations[0].scores?.average_score || evaluations[0].total_score || 0;
          const previousScore = evaluations[1].scores?.average_score || evaluations[1].total_score || 0;
          if (currentScore > previousScore) performanceTrend = 'improving';
          else if (currentScore < previousScore) performanceTrend = 'declining';
        }

        setEvaluationData({
          recentEvaluations: evaluations.slice(0, 3),
          averageScore: Math.round(averageScore),
          totalEvaluations: evaluations.length,
          performanceTrend,
          strengths: strengths.slice(0, 3),
          areasForImprovement: weaknesses.slice(0, 3),
          lastEvaluationDate: latestEvaluation.submitted_at
        });
      }
    } catch (error) {
      console.error('Error loading evaluation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'danger';
  };

  const getPerformanceTrendIcon = (trend) => {
    switch (trend) {
      case 'improving': return faArrowUp;
      case 'declining': return faArrowDown;
      default: return faChartBar;
    }
  };

  const getPerformanceTrendColor = (trend) => {
    switch (trend) {
      case 'improving': return 'success';
      case 'declining': return 'danger';
      default: return 'info';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-3">
        <Spinner animation="border" size="sm" />
        <div className="mt-2 small text-muted">Loading evaluation data...</div>
      </div>
    );
  }

  if (evaluationData.totalEvaluations === 0) {
    return (
      <div className="text-center py-4">
        <FontAwesomeIcon icon={faChartBar} className="fs-1 text-muted opacity-25" />
        <div className="mt-2 text-muted">No evaluation data available</div>
        <small className="text-muted">Complete your first evaluation to see analytics</small>
      </div>
    );
  }

  return (
    <div className="evaluation-analytics-section">
      {/* Performance Overview */}
      <Row className="mb-3">
        <Col md={6}>
          <Card className="border-0 bg-light h-100">
            <Card.Body className="p-3">
              <div className="d-flex align-items-center mb-2">
                <FontAwesomeIcon icon={faTrophy} className="text-warning me-2" />
                <h6 className="mb-0">Average Score</h6>
              </div>
              <div className="d-flex align-items-center">
                <h4 className={`mb-0 text-${getScoreColor(evaluationData.averageScore)}`}>
                  {evaluationData.averageScore}%
                </h4>
                <ProgressBar 
                  className="ms-3 flex-grow-1" 
                  variant={getScoreColor(evaluationData.averageScore)}
                  now={evaluationData.averageScore} 
                  style={{ height: '8px' }}
                />
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="border-0 bg-light h-100">
            <Card.Body className="p-3">
              <div className="d-flex align-items-center mb-2">
                <FontAwesomeIcon 
                  icon={getPerformanceTrendIcon(evaluationData.performanceTrend)} 
                  className={`text-${getPerformanceTrendColor(evaluationData.performanceTrend)} me-2`} 
                />
                <h6 className="mb-0">Performance Trend</h6>
              </div>
              <div className="d-flex align-items-center">
                <Badge bg={getPerformanceTrendColor(evaluationData.performanceTrend)} className="me-2">
                  {evaluationData.performanceTrend.charAt(0).toUpperCase() + evaluationData.performanceTrend.slice(1)}
                </Badge>
                <small className="text-muted">
                  {evaluationData.totalEvaluations} evaluation{evaluationData.totalEvaluations !== 1 ? 's' : ''}
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Recent Evaluations */}
      <div className="mb-3">
        <h6 className="text-secondary mb-2">
          <FontAwesomeIcon icon={faClock} className="me-2" />
          Recent Evaluations
        </h6>
        <div className="list-group list-group-flush">
          {evaluationData.recentEvaluations.map((evaluation, index) => (
            <div key={evaluation.id} className="list-group-item border-0 px-0 py-2">
              <div className="d-flex justify-content-between align-items-center">
                <div className="flex-grow-1">
                  <div className="d-flex align-items-center">
                    <h6 className="mb-0 me-2">{evaluation.form_title || 'Performance Evaluation'}</h6>
                    <Badge bg={getScoreColor(evaluation.scores?.average_score || evaluation.total_score || 0)}>
                      {evaluation.scores?.average_score || evaluation.total_score || 0}%
                    </Badge>
                  </div>
                  <small className="text-muted">
                    {new Date(evaluation.submitted_at).toLocaleDateString()}
                  </small>
                </div>
                <FontAwesomeIcon icon={faEye} className="text-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Strengths and Areas for Improvement */}
      <Row>
        <Col md={6}>
          <div className="mb-2">
            <h6 className="text-success mb-2">
              <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
              Key Strengths
            </h6>
            {evaluationData.strengths.length > 0 ? (
              <ul className="list-unstyled small">
                {evaluationData.strengths.map((strength, index) => (
                  <li key={index} className="mb-1">
                    <FontAwesomeIcon icon={faCheckCircle} className="text-success me-2" size="sm" />
                    {strength}
                  </li>
                ))}
              </ul>
            ) : (
              <small className="text-muted">No specific strengths identified</small>
            )}
          </div>
        </Col>
        <Col md={6}>
          <div className="mb-2">
            <h6 className="text-warning mb-2">
              <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
              Areas for Improvement
            </h6>
            {evaluationData.areasForImprovement.length > 0 ? (
              <ul className="list-unstyled small">
                {evaluationData.areasForImprovement.map((area, index) => (
                  <li key={index} className="mb-1">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="text-warning me-2" size="sm" />
                    {area}
                  </li>
                ))}
              </ul>
            ) : (
              <small className="text-muted">No specific areas identified</small>
            )}
          </div>
        </Col>
      </Row>

      {/* Last Evaluation Info */}
      {evaluationData.lastEvaluationDate && (
        <div className="mt-3 pt-3 border-top">
          <small className="text-muted">
            <FontAwesomeIcon icon={faClock} className="me-1" />
            Last evaluation: {new Date(evaluationData.lastEvaluationDate).toLocaleDateString()}
          </small>
        </div>
      )}
    </div>
  );
};

export default EvaluationAnalyticsSection;
