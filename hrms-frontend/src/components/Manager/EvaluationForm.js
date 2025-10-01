import React, { useState } from 'react';
import { 
  Star,
  MessageSquare,
  Send,
  X,
  User,
  Building,
  Hash,
  AlertCircle
} from 'lucide-react';
import axios from '../../axios';
import { toast } from 'react-toastify';

const EvaluationForm = ({ employee, evaluationData, activeForm, onSubmit, onCancel }) => {
  const [responses, setResponses] = useState(
    evaluationData.responses || {}
  );
  const [generalComments, setGeneralComments] = useState(
    evaluationData.evaluation?.general_comments || ''
  );
  const [submitting, setSubmitting] = useState(false);

  const handleRatingChange = (questionId, rating) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        question_id: questionId,
        rating: parseInt(rating),
        comment: prev[questionId]?.comment || ''
      }
    }));
  };

  const handleCommentChange = (questionId, comment) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        question_id: questionId,
        rating: prev[questionId]?.rating || 1,
        comment: comment
      }
    }));
  };

  const getClassification = (rating) => {
    if (rating >= 8) return { text: 'Strength', color: '#22c55e' };
    if (rating <= 6) return { text: 'Weakness', color: '#ef4444' };
    return { text: 'Neutral', color: '#f59e0b' };
  };

  const calculatePreviewScores = () => {
    const responseArray = Object.values(responses);
    const totalQuestions = activeForm.questions.length;
    const answeredQuestions = responseArray.length;
    
    if (answeredQuestions === 0) {
      return { total: 0, average: 0, percentage: 0, complete: false };
    }

    const totalScore = responseArray.reduce((sum, response) => sum + (response.rating || 0), 0);
    const maxPossibleScore = answeredQuestions * 10;
    const average = totalScore / answeredQuestions;
    const percentage = (totalScore / maxPossibleScore) * 100;
    
    return {
      total: totalScore,
      average: average,
      percentage: percentage,
      complete: answeredQuestions === totalQuestions,
      answered: answeredQuestions,
      totalQuestions: totalQuestions
    };
  };

  const handleSubmit = async () => {
    const scores = calculatePreviewScores();
    
    if (!scores.complete) {
      toast.error(`Please complete all ${scores.totalQuestions} questions before submitting.`);
      return;
    }

    try {
      setSubmitting(true);
      
      const submissionData = {
        responses: Object.values(responses),
        general_comments: generalComments
      };

      const response = await axios.post(
        `/manager-evaluations/submit/${evaluationData.evaluation.id}`,
        submissionData
      );

      // Show success message first
      toast.success('Evaluation submitted successfully!');
      
      // Call the parent onSubmit callback with both result and employee data for notification
      onSubmit({
        ...response.data.data,
        employee: employee // Pass employee data for notification
      });
    } catch (error) {
      console.error('Error submitting evaluation:', error);
      toast.error(error.response?.data?.message || 'Failed to submit evaluation');
    } finally {
      setSubmitting(false);
    }
  };

  const scores = calculatePreviewScores();

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h2 style={styles.title}>Employee Evaluation</h2>
          <div style={styles.formInfo}>
            <span style={styles.formTitle}>{activeForm.title}</span>
            <span style={styles.separator}>•</span>
            <span style={styles.questionCount}>{activeForm.questions.length} Questions</span>
          </div>
        </div>
        <button onClick={onCancel} style={styles.closeButton}>
          <X size={24} />
        </button>
      </div>

      {/* Employee Info */}
      <div style={styles.employeeCard}>
        <div style={styles.employeeInfo}>
          <div style={styles.employeeDetails}>
            <div style={styles.employeeName}>
              <User size={18} />
              {employee.name}
            </div>
            <div style={styles.employeeMeta}>
              <div style={styles.metaItem}>
                <Building size={16} />
                {employee.department} • {employee.position}
              </div>
              <div style={styles.metaItem}>
                <Hash size={16} />
                {employee.employee_id}
              </div>
            </div>
          </div>
          
          {/* Score Preview */}
          <div style={styles.scorePreview}>
            <div style={styles.scoreHeader}>Live Score</div>
            <div style={styles.scoreMetrics}>
              <div style={styles.scoreItem}>
                <div style={styles.scoreValue}>{scores.total}</div>
                <div style={styles.scoreLabel}>Total Score</div>
              </div>
              <div style={styles.scoreItem}>
                <div style={styles.scoreValue}>{scores.average.toFixed(1)}</div>
                <div style={styles.scoreLabel}>Average</div>
              </div>
              <div style={styles.scoreItem}>
                <div style={styles.scoreValue}>{scores.percentage.toFixed(1)}%</div>
                <div style={styles.scoreLabel}>Percentage</div>
              </div>
            </div>
            <div style={styles.progressContainer}>
              <div style={styles.progressBar}>
                <div 
                  style={{
                    ...styles.progressFill,
                    width: `${(scores.answered / scores.totalQuestions) * 100}%`
                  }}
                />
              </div>
              <div style={styles.progressText}>
                {scores.answered} of {scores.totalQuestions} completed
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Questions */}
      <div style={styles.questionsContainer}>
        {activeForm.questions.map((question, index) => {
          const currentResponse = responses[question.id] || {};
          const rating = currentResponse.rating || 0;
          const comment = currentResponse.comment || '';
          const classification = rating > 0 ? getClassification(rating) : null;

          return (
            <div key={question.id} style={styles.questionCard}>
              <div style={styles.questionHeader}>
                <div style={styles.questionNumber}>{index + 1}</div>
                <div style={styles.questionContent}>
                  <div style={styles.questionCategory}>{question.category}</div>
                  <div style={styles.questionText}>{question.question_text}</div>
                  {question.description && (
                    <div style={styles.questionDescription}>{question.description}</div>
                  )}
                </div>
              </div>

              {/* Rating Scale */}
              <div style={styles.ratingContainer}>
                <div style={styles.ratingLabel}>Rate from 1 to 10:</div>
                <div style={styles.ratingScale}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                    <button
                      key={value}
                      onClick={() => handleRatingChange(question.id, value)}
                      style={{
                        ...styles.ratingButton,
                        ...(rating === value ? styles.ratingButtonActive : {})
                      }}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                
                {classification && (
                  <div style={styles.classificationContainer}>
                    <div 
                      style={{
                        ...styles.classificationBadge,
                        backgroundColor: classification.color + '20',
                        color: classification.color
                      }}
                    >
                      {classification.text}
                    </div>
                  </div>
                )}
              </div>

              {/* Comment Section */}
              <div style={styles.commentContainer}>
                <div style={styles.commentLabel}>
                  <MessageSquare size={16} />
                  Manager Comments
                </div>
                <textarea
                  value={comment}
                  onChange={(e) => handleCommentChange(question.id, e.target.value)}
                  placeholder="Add your comments about this aspect..."
                  style={styles.commentTextarea}
                  rows={3}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* General Comments */}
      <div style={styles.generalCommentsContainer}>
        <div style={styles.generalCommentsHeader}>
          <MessageSquare size={20} />
          General Comments
        </div>
        <textarea
          value={generalComments}
          onChange={(e) => setGeneralComments(e.target.value)}
          placeholder="Add your overall comments about the employee's performance..."
          style={styles.generalCommentsTextarea}
          rows={4}
        />
      </div>

      {/* Submit Section */}
      <div style={styles.submitContainer}>
        {!scores.complete && (
          <div style={styles.warningMessage}>
            <AlertCircle size={16} />
            Please complete all {scores.totalQuestions} questions before submitting
          </div>
        )}
        
        <div style={styles.submitButtons}>
          <button onClick={onCancel} style={styles.cancelButton}>
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            disabled={submitting || !scores.complete}
            style={{
              ...styles.submitButton,
              ...(submitting || !scores.complete ? styles.submitButtonDisabled : {})
            }}
          >
            {submitting ? (
              <>
                <div style={styles.spinner} />
                Submitting...
              </>
            ) : (
              <>
                <Send size={16} />
                Submit Evaluation
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    backgroundColor: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 30px',
    backgroundColor: '#6366f1',
    color: 'white',
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    margin: 0,
    marginBottom: '4px',
  },
  formInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    opacity: 0.9,
  },
  formTitle: {
    fontWeight: '500',
  },
  separator: {
    opacity: 0.7,
  },
  questionCount: {},
  closeButton: {
    padding: '8px',
    backgroundColor: 'rgba(255,255,255,0.2)',
    border: 'none',
    borderRadius: '6px',
    color: 'white',
    cursor: 'pointer',
  },
  employeeCard: {
    padding: '30px',
    borderBottom: '1px solid #e5e7eb',
  },
  employeeInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '30px',
  },
  employeeDetails: {
    flex: 1,
  },
  employeeName: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '20px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '12px',
  },
  employeeMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#6b7280',
  },
  scorePreview: {
    minWidth: '250px',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '12px',
    border: '2px solid #e5e7eb',
  },
  scoreHeader: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '16px',
    textAlign: 'center',
  },
  scoreMetrics: {
    display: 'flex',
    justifyContent: 'space-around',
    marginBottom: '16px',
  },
  scoreItem: {
    textAlign: 'center',
  },
  scoreValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#6366f1',
    marginBottom: '4px',
  },
  scoreLabel: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: '500',
  },
  progressContainer: {
    marginTop: '16px',
  },
  progressBar: {
    width: '100%',
    height: '8px',
    backgroundColor: '#e5e7eb',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22c55e',
    transition: 'width 0.3s ease',
  },
  progressText: {
    fontSize: '12px',
    color: '#6b7280',
    textAlign: 'center',
    marginTop: '8px',
  },
  questionsContainer: {
    padding: '0 30px',
  },
  questionCard: {
    padding: '30px 0',
    borderBottom: '1px solid #f3f4f6',
  },
  questionHeader: {
    display: 'flex',
    gap: '20px',
    marginBottom: '24px',
  },
  questionNumber: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    backgroundColor: '#6366f1',
    color: 'white',
    borderRadius: '50%',
    fontSize: '16px',
    fontWeight: '600',
    flexShrink: 0,
  },
  questionContent: {
    flex: 1,
  },
  questionCategory: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#6366f1',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '8px',
  },
  questionText: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: '8px',
    lineHeight: 1.5,
  },
  questionDescription: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: 1.4,
  },
  ratingContainer: {
    marginBottom: '24px',
  },
  ratingLabel: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '12px',
  },
  ratingScale: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px',
    flexWrap: 'wrap',
  },
  ratingButton: {
    width: '44px',
    height: '44px',
    border: '2px solid #e5e7eb',
    backgroundColor: 'white',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#6b7280',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  ratingButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
    color: 'white',
  },
  classificationContainer: {
    display: 'flex',
    justifyContent: 'center',
  },
  classificationBadge: {
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
  },
  commentContainer: {
    marginBottom: '12px',
  },
  commentLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '8px',
  },
  commentTextarea: {
    width: '100%',
    padding: '12px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#374151',
    resize: 'vertical',
    outline: 'none',
    fontFamily: 'inherit',
  },
  generalCommentsContainer: {
    padding: '30px',
    backgroundColor: '#f8f9fa',
    borderTop: '1px solid #e5e7eb',
  },
  generalCommentsHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '16px',
  },
  generalCommentsTextarea: {
    width: '100%',
    padding: '16px',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    fontSize: '14px',
    color: '#374151',
    resize: 'vertical',
    outline: 'none',
    fontFamily: 'inherit',
  },
  submitContainer: {
    padding: '30px',
    backgroundColor: 'white',
    borderTop: '1px solid #e5e7eb',
  },
  warningMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: '#fef3cd',
    color: '#856404',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px',
    fontWeight: '500',
  },
  submitButtons: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    padding: '12px 24px',
    backgroundColor: 'white',
    color: '#6b7280',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  submitButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    backgroundColor: '#22c55e',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed',
  },
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTop: '2px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
};

export default EvaluationForm;