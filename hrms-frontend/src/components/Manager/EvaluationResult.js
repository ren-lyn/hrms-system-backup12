import React from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Download, 
  User, 
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Star,
  Award
} from 'lucide-react';
import './EvaluationResult.css';

const EvaluationResult = ({ result, onBack, showBackButton = true, backButtonText = 'Back to Employee List' }) => {
  if (!result) {
    return <div className="evaluation-result__loading">Loading result...</div>;
  }

  const { evaluation, scores, analysis } = result || {};
  
  const safeAnalysis = analysis || { strengths: [], weaknesses: [], strengths_count: 0, weaknesses_count: 0 };
  const safeScores = scores || { total_score: 0, average_score: 0, percentage: 0, total_questions: 0, passing_score: 0, is_passed: false };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getGradeFromPercentage = (percentage) => {
    if (percentage >= 90) return { grade: 'A', color: '#2563eb' };
    if (percentage >= 80) return { grade: 'B', color: '#059669' };
    if (percentage >= 70) return { grade: 'C', color: '#d97706' };
    if (percentage >= 60) return { grade: 'D', color: '#ea580c' };
    return { grade: 'F', color: '#dc2626' };
  };

  const getClassificationTone = (classification) => {
    switch (classification) {
      case 'Strength':
        return { background: '#dcfce7', text: '#047857' };
      case 'Weakness':
        return { background: '#fee2e2', text: '#b91c1c' };
      default:
        return { background: '#fef3c7', text: '#b45309' };
    }
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

  const gradeInfo = getGradeFromPercentage(Number(safeScores.percentage) || 0);
  const totalQuestions = safeScores.total_questions || safeScores.question_count || 0;
  const totalPoints = totalQuestions * 10;

  return (
    <div className="evaluation-result">
      <section className="evaluation-card evaluation-card--header">
        <div>
          <span className="evaluation-card__eyebrow">Evaluation Summary</span>
          <h1 className="evaluation-card__title">Evaluation Results</h1>
          <p className="evaluation-card__subtitle">Performance evaluation completed successfully</p>
          </div>
        <button type="button" className="evaluation-btn evaluation-btn--primary" onClick={handleDownloadPDF}>
              <Download size={16} />
              Download PDF
            </button>
      </section>

      <section className="evaluation-card score-card">
        <div className="score-card__primary">
          <div className="score-card__summary">
            <div
              className="score-card__grade"
              style={{
                borderColor: gradeInfo.color,
                color: gradeInfo.color,
                backgroundColor: `${gradeInfo.color}14`
              }}
            >
                {gradeInfo.grade}
            </div>
            <div>
              <p className="score-card__label">Overall Performance</p>
              <p className="score-card__value">
                {safeScores.total_score} / {totalPoints || '—'} points
              </p>
            </div>
          </div>
          
          <dl className="score-card__metrics">
            <div className="score-card__metric">
              <dt>Score Percentage</dt>
              <dd>{Number.isFinite(Number(safeScores.percentage)) ? Number(safeScores.percentage).toFixed(2) : '—'}%</dd>
            </div>
            <div className="score-card__metric">
              <dt>Average Rating</dt>
              <dd>{Number.isFinite(Number(safeScores.average_score)) ? Number(safeScores.average_score).toFixed(2) : '—'}</dd>
            </div>
            <div className="score-card__metric">
              <dt>Questions</dt>
              <dd>{totalQuestions}</dd>
            </div>
          </dl>
        </div>

        <div
          className={`score-card__status ${safeScores.is_passed ? 'score-card__status--passed' : 'score-card__status--failed'}`}
          style={{
            borderColor: safeScores.is_passed ? '#22c55e33' : '#ef444433',
            backgroundColor: safeScores.is_passed ? '#ecfdf5' : '#fef2f2',
            color: safeScores.is_passed ? '#047857' : '#b91c1c'
          }}
        >
          {safeScores.is_passed ? <CheckCircle size={22} /> : <XCircle size={22} />}
              <div>
            <span className="score-card__status-title">{safeScores.is_passed ? 'Passed' : 'Needs Attention'}</span>
            <span className="score-card__status-subtitle">
              {safeScores.is_passed ? 'Exceeded' : 'Below'} minimum score of {safeScores.passing_score || '—'}
            </span>
            </div>
        </div>
      </section>

      <section className="info-grid">
        <div className="evaluation-card info-card">
          <h2 className="section-title">
            <User size={18} />
            Employee Information
          </h2>
          <div className="info-card__grid">
            <div className="info-card__item">
              <span className="info-card__label">Name</span>
              <span className="info-card__value">
                {evaluation?.employee?.employee_profile?.first_name && evaluation?.employee?.employee_profile?.last_name
                ? `${evaluation.employee.employee_profile.first_name} ${evaluation.employee.employee_profile.last_name}`
                  : evaluation?.employee?.name || 'N/A'}
              </span>
            </div>
            <div className="info-card__item">
              <span className="info-card__label">Employee ID</span>
              <span className="info-card__value">{evaluation?.employee?.employee_profile?.employee_id || 'N/A'}</span>
            </div>
            <div className="info-card__item">
              <span className="info-card__label">Department</span>
              <span className="info-card__value">{evaluation?.employee?.employee_profile?.department || 'N/A'}</span>
            </div>
            <div className="info-card__item">
              <span className="info-card__label">Position</span>
              <span className="info-card__value">{evaluation?.employee?.employee_profile?.position || 'N/A'}</span>
            </div>
            <div className="info-card__item">
              <span className="info-card__label">Evaluated By</span>
              <span className="info-card__value">
                {evaluation?.manager?.employee_profile?.first_name && evaluation?.manager?.employee_profile?.last_name
                ? `${evaluation.manager.employee_profile.first_name} ${evaluation.manager.employee_profile.last_name}`
                  : evaluation?.manager?.name || evaluation?.manager?.email || 'N/A'}
              </span>
            </div>
            <div className="info-card__item">
              <span className="info-card__label">Evaluation Date</span>
              <span className="info-card__value">{formatDate(evaluation?.submitted_at)}</span>
            </div>
          </div>
        </div>

        <div className="evaluation-card analysis-card">
          <h2 className="section-title">
            <Award size={18} />
            Performance Analysis
          </h2>
          <div className="analysis-card__grid">
            <div className="analysis-card__column">
              <div className="analysis-card__header analysis-card__header--strength">
                <TrendingUp size={16} />
                <span>Strengths</span>
                <span className="analysis-card__count">{safeAnalysis.strengths_count}</span>
              </div>
              <ul className="analysis-card__list">
                {safeAnalysis.strengths.slice(0, 3).map((response, index) => (
                  <li key={`strength-${index}`} className="analysis-card__item">
                    <Star size={14} />
                    <span>{response?.question?.category || 'Category unavailable'}</span>
                    <span className="analysis-card__score">{response?.rating ?? '—'}/10</span>
                  </li>
                ))}
                {safeAnalysis.strengths.length === 0 && <li className="analysis-card__empty">No strengths recorded.</li>}
              </ul>
            </div>

            <div className="analysis-card__column">
              <div className="analysis-card__header analysis-card__header--improvement">
                <TrendingDown size={16} />
                <span>Areas for Improvement</span>
                <span className="analysis-card__count">{safeAnalysis.weaknesses_count}</span>
              </div>
              <ul className="analysis-card__list">
                {safeAnalysis.weaknesses.slice(0, 3).map((response, index) => (
                  <li key={`weakness-${index}`} className="analysis-card__item">
                    <Star size={14} />
                    <span>{response?.question?.category || 'Category unavailable'}</span>
                    <span className="analysis-card__score">{response?.rating ?? '—'}/10</span>
                  </li>
                ))}
                {safeAnalysis.weaknesses.length === 0 && <li className="analysis-card__empty">No priority improvements found.</li>}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="evaluation-card responses-card">
        <h2 className="section-title">
          <MessageSquare size={18} />
          Detailed Responses
        </h2>
        <div className="responses-card__list">
          {evaluation?.responses?.map((response, index) => {
            const tone = getClassificationTone(response?.classification);
            return (
              <article key={response?.id ?? `response-${index}`} className="response-item">
                <div className="response-item__header">
                  <div className="response-item__index">{index + 1}</div>
                  <div className="response-item__content">
                    <span className="response-item__category">{response?.question?.category || 'Uncategorized'}</span>
                    <p className="response-item__question">{response?.question?.question_text || 'Question text unavailable.'}</p>
                  </div>
                  <div className="response-item__rating">
                    <span className="response-item__rating-value">{response?.rating ?? '—'}</span>
                    <span className="response-item__rating-scale">/10</span>
                </div>
              </div>
              
                <div className="response-item__meta">
                  <span
                    className="response-item__classification"
                  style={{
                      backgroundColor: tone.background,
                      color: tone.text
                    }}
                  >
                    {response?.classification || 'Unclassified'}
                  </span>

                  {response?.manager_comment && (
                    <div className="response-item__comment">
                      <span className="response-item__comment-label">Manager Comment</span>
                      <p className="response-item__comment-text">{response.manager_comment}</p>
                  </div>
                )}
              </div>
              </article>
            );
          })}
        </div>
      </section>

      {evaluation?.general_comments && (
        <section className="evaluation-card comments-card">
          <h2 className="section-title">
            <MessageSquare size={18} />
            General Comments
          </h2>
          <p className="comments-card__text">{evaluation.general_comments}</p>
        </section>
      )}

      {showBackButton && (
        <div className="evaluation-result__actions">
          <button type="button" className="evaluation-btn evaluation-btn--ghost" onClick={onBack}>
            {backButtonText}
          </button>
        </div>
      )}
    </div>
  );
};

export default EvaluationResult;