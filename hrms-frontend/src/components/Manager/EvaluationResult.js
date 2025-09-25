import React from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Download, 
  User, 
  Calendar, 
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Star,
  Award
} from 'lucide-react';

const EvaluationResult = ({ result, onBack, showBackButton = true, backButtonText = 'Back to Employee List' }) => {
  if (!result) {
    return (
      <div style={{ padding: 20 }}>Loading result...</div>
    );
  }

  const { evaluation, scores, analysis } = result || {};
  
  // Basic guards to avoid runtime errors if API shape varies
  const safeAnalysis = analysis || { strengths: [], weaknesses: [], strengths_count: 0, weaknesses_count: 0 };
  const safeScores = scores || { total_score: 0, average_score: 0, percentage: 0, total_questions: 0, passing_score: 0, is_passed: false };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreColor = (score, total) => {
    const percentage = (score / total) * 100;
    if (percentage >= 80) return '#22c55e';
    if (percentage >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const getGradeFromPercentage = (percentage) => {
    if (percentage >= 90) return { grade: 'A', color: '#22c55e' };
    if (percentage >= 80) return { grade: 'B', color: '#3b82f6' };
    if (percentage >= 70) return { grade: 'C', color: '#f59e0b' };
    if (percentage >= 60) return { grade: 'D', color: '#f97316' };
    return { grade: 'F', color: '#ef4444' };
  };

  const handleDownloadPDF = async () => {
    try {
      const evaluationId = evaluation?.id || result?.evaluation?.id;
      if (!evaluationId) return;
      const axiosModule = (await import('../../axios')).default;
      const response = await axiosModule.get(`/manager-evaluations/result/${evaluationId}/pdf`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `evaluation_result_${evaluationId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download PDF', err);
      alert('Failed to download PDF');
    }
  };

  const gradeInfo = getGradeFromPercentage(safeScores.percentage);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.headerLeft}>
            <h1 style={styles.title}>Evaluation Results</h1>
            <p style={styles.subtitle}>Performance evaluation completed successfully</p>
          </div>
          <div style={styles.headerRight}>
            <button onClick={handleDownloadPDF} style={styles.downloadButton}>
              <Download size={16} />
              Download PDF
            </button>
          </div>
        </div>
      </div>

      {/* Overall Score Card */}
      <div style={styles.scoreCard}>
        <div style={styles.scoreCardLeft}>
          <div style={styles.mainScore}>
            <div 
              style={{
                ...styles.gradeCircle,
                backgroundColor: gradeInfo.color + '20',
                borderColor: gradeInfo.color
              }}
            >
              <span style={{ ...styles.gradeText, color: gradeInfo.color }}>
                {gradeInfo.grade}
              </span>
            </div>
            <div style={styles.scoreDetails}>
              <div style={styles.scoreTitle}>Overall Performance</div>
              <div style={styles.scoreSubtitle}>
                {safeScores.total_score} / {(safeScores.total_questions || safeScores.question_count || 0) * 10} points
              </div>
            </div>
          </div>
          
          <div style={styles.scoreMetrics}>
            <div style={styles.metric}>
              <div style={styles.metricValue}>{safeScores.percentage}%</div>
              <div style={styles.metricLabel}>Score Percentage</div>
            </div>
            <div style={styles.metric}>
              <div style={styles.metricValue}>{safeScores.average_score}</div>
              <div style={styles.metricLabel}>Average Rating</div>
            </div>
            <div style={styles.metric}>
              <div style={styles.metricValue}>{safeScores.total_questions || safeScores.question_count || 0}</div>
              <div style={styles.metricLabel}>Questions</div>
            </div>
          </div>
        </div>

        <div style={styles.passStatus}>
          {safeScores.is_passed ? (
            <div style={styles.passedBadge}>
              <CheckCircle size={24} />
              <div>
                <div style={styles.statusTitle}>PASSED</div>
                <div style={styles.statusSubtitle}>
                  Exceeded minimum score of {safeScores.passing_score}
                </div>
              </div>
            </div>
          ) : (
            <div style={styles.failedBadge}>
              <XCircle size={24} />
              <div>
                <div style={styles.statusTitle}>NEEDS IMPROVEMENT</div>
                <div style={styles.statusSubtitle}>
                  Below minimum score of {safeScores.passing_score}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={styles.contentGrid}>
        {/* Employee Information */}
        <div style={styles.infoCard}>
          <h3 style={styles.cardTitle}>
            <User size={20} />
            Employee Information
          </h3>
          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <div style={styles.infoLabel}>Name</div>
              <div style={styles.infoValue}>{(evaluation.employee?.employee_profile?.first_name && evaluation.employee?.employee_profile?.last_name)
                ? `${evaluation.employee.employee_profile.first_name} ${evaluation.employee.employee_profile.last_name}`
                : (evaluation.employee?.name || 'N/A')}</div>
            </div>
            <div style={styles.infoItem}>
              <div style={styles.infoLabel}>Employee ID</div>
              <div style={styles.infoValue}>
                {evaluation.employee.employee_profile?.employee_id || 'N/A'}
              </div>
            </div>
            <div style={styles.infoItem}>
              <div style={styles.infoLabel}>Department</div>
              <div style={styles.infoValue}>
                {evaluation.employee.employee_profile?.department || 'N/A'}
              </div>
            </div>
            <div style={styles.infoItem}>
              <div style={styles.infoLabel}>Position</div>
              <div style={styles.infoValue}>
                {evaluation.employee.employee_profile?.position || 'N/A'}
              </div>
            </div>
            <div style={styles.infoItem}>
              <div style={styles.infoLabel}>Evaluated By</div>
              <div style={styles.infoValue}>{(evaluation.manager?.employee_profile?.first_name && evaluation.manager?.employee_profile?.last_name)
                ? `${evaluation.manager.employee_profile.first_name} ${evaluation.manager.employee_profile.last_name}`
                : (evaluation.manager?.name || evaluation.manager?.email || 'N/A')}</div>
            </div>
            <div style={styles.infoItem}>
              <div style={styles.infoLabel}>Evaluation Date</div>
              <div style={styles.infoValue}>
                {formatDate(evaluation.submitted_at)}
              </div>
            </div>
          </div>
        </div>

        {/* Performance Analysis */}
        <div style={styles.analysisCard}>
          <h3 style={styles.cardTitle}>
            <Award size={20} />
            Performance Analysis
          </h3>
          
          <div style={styles.analysisGrid}>
            <div style={styles.analysisItem}>
              <div style={styles.analysisHeader}>
                <TrendingUp size={16} color="#22c55e" />
                <span style={styles.analysisTitle}>Strengths</span>
                <span style={styles.analysisCount}>{safeAnalysis.strengths_count}</span>
              </div>
              <div style={styles.analysisList}>
                {safeAnalysis.strengths.slice(0, 3).map((response, index) => (
                  <div key={index} style={styles.analysisListItem}>
                    <Star size={12} color="#22c55e" />
                    <span>{response.question.category}</span>
                    <span style={styles.ratingBadge}>{response.rating}/10</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={styles.analysisItem}>
              <div style={styles.analysisHeader}>
                <TrendingDown size={16} color="#ef4444" />
                <span style={styles.analysisTitle}>Areas for Improvement</span>
                <span style={styles.analysisCount}>{safeAnalysis.weaknesses_count}</span>
              </div>
              <div style={styles.analysisList}>
                {safeAnalysis.weaknesses.slice(0, 3).map((response, index) => (
                  <div key={index} style={styles.analysisListItem}>
                    <Star size={12} color="#ef4444" />
                    <span>{response.question.category}</span>
                    <span style={styles.ratingBadge}>{response.rating}/10</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Responses */}
      <div style={styles.responsesCard}>
        <h3 style={styles.cardTitle}>
          <MessageSquare size={20} />
          Detailed Responses
        </h3>
        
        <div style={styles.responsesList}>
          {evaluation.responses.map((response, index) => (
            <div key={response.id} style={styles.responseItem}>
              <div style={styles.responseHeader}>
                <div style={styles.responseNumber}>{index + 1}</div>
                <div style={styles.responseQuestion}>
                  <div style={styles.responseCategory}>{response.question.category}</div>
                  <div style={styles.responseText}>{response.question.question_text}</div>
                </div>
                <div style={styles.responseRating}>
                  <div style={styles.ratingValue}>{response.rating}</div>
                  <div style={styles.ratingScale}>/10</div>
                </div>
              </div>
              
              <div style={styles.responseDetails}>
                <div 
                  style={{
                    ...styles.classificationBadge,
                    backgroundColor: 
                      response.classification === 'Strength' ? '#22c55e20' :
                      response.classification === 'Weakness' ? '#ef444420' : '#f59e0b20',
                    color:
                      response.classification === 'Strength' ? '#22c55e' :
                      response.classification === 'Weakness' ? '#ef4444' : '#f59e0b'
                  }}
                >
                  {response.classification}
                </div>
                
                {response.manager_comment && (
                  <div style={styles.responseComment}>
                    <div style={styles.commentLabel}>Manager Comment:</div>
                    <div style={styles.commentText}>{response.manager_comment}</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* General Comments */}
      {evaluation.general_comments && (
        <div style={styles.generalCommentsCard}>
          <h3 style={styles.cardTitle}>
            <MessageSquare size={20} />
            General Comments
          </h3>
          <div style={styles.generalCommentsText}>
            {evaluation.general_comments}
          </div>
        </div>
      )}

      {/* Action Button */}
      {showBackButton && (
        <div style={styles.actionContainer}>
          <button onClick={onBack} style={styles.backButton}>
            {backButtonText}
          </button>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    backgroundColor: '#f8f9fa',
    minHeight: '100vh',
    paddingBottom: '40px',
  },
  header: {
    backgroundColor: 'white',
    padding: '30px',
    marginBottom: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {},
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1f2937',
    margin: 0,
    marginBottom: '4px',
  },
  subtitle: {
    fontSize: '16px',
    color: '#6b7280',
    margin: 0,
  },
  headerRight: {},
  downloadButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 20px',
    backgroundColor: '#6366f1',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  scoreCard: {
    backgroundColor: 'white',
    padding: '30px',
    marginBottom: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreCardLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '40px',
  },
  mainScore: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  gradeCircle: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    border: '4px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeText: {
    fontSize: '32px',
    fontWeight: '700',
  },
  scoreDetails: {},
  scoreTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '4px',
  },
  scoreSubtitle: {
    fontSize: '14px',
    color: '#6b7280',
  },
  scoreMetrics: {
    display: 'flex',
    gap: '30px',
  },
  metric: {
    textAlign: 'center',
  },
  metricValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '4px',
  },
  metricLabel: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: '500',
  },
  passStatus: {},
  passedBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 20px',
    backgroundColor: '#22c55e20',
    color: '#22c55e',
    borderRadius: '12px',
    border: '2px solid #22c55e40',
  },
  failedBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 20px',
    backgroundColor: '#ef444420',
    color: '#ef4444',
    borderRadius: '12px',
    border: '2px solid #ef444440',
  },
  statusTitle: {
    fontSize: '16px',
    fontWeight: '700',
    marginBottom: '2px',
  },
  statusSubtitle: {
    fontSize: '13px',
    opacity: 0.8,
  },
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    marginBottom: '20px',
  },
  infoCard: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  analysisCard: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  cardTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '20px',
    margin: '0 0 20px 0',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  infoItem: {},
  infoLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '4px',
  },
  infoValue: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1f2937',
  },
  analysisGrid: {
    display: 'grid',
    gap: '24px',
  },
  analysisItem: {},
  analysisHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  analysisTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  analysisCount: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    padding: '4px 8px',
    borderRadius: '12px',
  },
  analysisList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  analysisListItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#374151',
  },
  ratingBadge: {
    marginLeft: 'auto',
    fontSize: '12px',
    fontWeight: '600',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    padding: '2px 6px',
    borderRadius: '8px',
  },
  responsesCard: {
    backgroundColor: 'white',
    padding: '24px',
    marginBottom: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  responsesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  responseItem: {
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
  },
  responseHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    marginBottom: '16px',
  },
  responseNumber: {
    width: '32px',
    height: '32px',
    backgroundColor: '#6366f1',
    color: 'white',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '600',
    flexShrink: 0,
  },
  responseQuestion: {
    flex: 1,
  },
  responseCategory: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#6366f1',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '4px',
  },
  responseText: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1f2937',
    lineHeight: 1.4,
  },
  responseRating: {
    textAlign: 'right',
  },
  ratingValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1f2937',
  },
  ratingScale: {
    fontSize: '14px',
    color: '#6b7280',
    marginTop: '-4px',
  },
  responseDetails: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  classificationBadge: {
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
  },
  responseComment: {
    flex: 1,
  },
  commentLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: '4px',
  },
  commentText: {
    fontSize: '13px',
    color: '#374151',
    lineHeight: 1.4,
  },
  generalCommentsCard: {
    backgroundColor: 'white',
    padding: '24px',
    marginBottom: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  generalCommentsText: {
    fontSize: '14px',
    color: '#374151',
    lineHeight: 1.6,
    padding: '16px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  actionContainer: {
    textAlign: 'center',
    marginTop: '30px',
  },
  backButton: {
    padding: '12px 32px',
    backgroundColor: '#6366f1',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
};

export default EvaluationResult;