import React, { useEffect, useMemo, useState } from 'react';
import { Container, Row, Col, Card, Table, Form, Button, Spinner, Badge, Alert, Modal } from 'react-bootstrap';
import {
  FaSearch,
  FaDownload,
  FaRedo,
  FaUserTie,
  FaHistory,
  FaChartLine,
  FaMedal,
  FaCalendarCheck
} from 'react-icons/fa';
import axios from '../../../axios';
import EvaluationResult from '../../../components/Manager/EvaluationResult';

const calculateSummaryStats = (summaries) => {
  if (!summaries.length) {
    return { totalEvaluated: 0, averageScore: null, lastUpdated: null };
  }

  let totalScore = 0;
  let scoreCount = 0;
  let latestDate = null;

  summaries.forEach((summary) => {
    if (summary.average_score !== null && summary.average_score !== undefined) {
      totalScore += Number(summary.average_score);
      scoreCount += 1;
    }

    if (summary.submitted_at) {
      const submitted = new Date(summary.submitted_at);
      if (!latestDate || submitted > latestDate) {
        latestDate = submitted;
      }
    }
  });

  return {
    totalEvaluated: summaries.length,
    averageScore: scoreCount ? totalScore / scoreCount : null,
    lastUpdated: latestDate ? latestDate.toISOString() : null,
  };
};

const EvaluationResults = () => {
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [summaryError, setSummaryError] = useState('');
  const [employees, setEmployees] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsError, setResultsError] = useState('');
  const [employeeResults, setEmployeeResults] = useState([]);
  const [selectedResultId, setSelectedResultId] = useState(null);
  const [resultDetail, setResultDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [showResultModal, setShowResultModal] = useState(false);
  const [modalEmployee, setModalEmployee] = useState(null);

  const summaryMap = useMemo(() => {
    const map = new Map();
    summaries.forEach((summary) => map.set(summary.employee_id, summary));
    return map;
  }, [summaries]);

  const summaryStats = useMemo(
    () => calculateSummaryStats(summaries),
    [summaries]
  );

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (selectedResultId) {
      fetchResultDetail(selectedResultId);
    }
  }, [selectedResultId]);

  useEffect(() => {
    if (modalEmployee) {
      setShowResultModal(true);
      fetchEmployeeResults(modalEmployee);
    } else {
      setShowResultModal(false);
      setEmployeeResults([]);
      setResultDetail(null);
      setSelectedResultId(null);
      setResultsError('');
      setDetailError('');
      setResultsLoading(false);
      setDetailLoading(false);
    }
  }, [modalEmployee]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setPageError('');
      const response = await axios.get('/manager-evaluations/employees');
      const employeeData = response.data?.data || [];
      setEmployees(employeeData);

      await fetchEvaluationSummaries();
    } catch (error) {
      console.error('Failed to load employees for evaluation results:', error);
      setPageError(
        error.response?.data?.message ||
          error.message ||
          'Failed to load employees. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchEvaluationSummaries = async () => {
    try {
      setSummaryLoading(true);
      setSummaryError('');
      const response = await axios.get('/manager-evaluations/employee-results/summary');
      setSummaries(response.data?.data || []);
    } catch (error) {
      console.error('Failed to load evaluation summaries:', error);
      setSummaryError(
        error.response?.data?.message ||
          error.message ||
          'Unable to load evaluation summaries. Latest data may be incomplete.'
      );
    } finally {
      setSummaryLoading(false);
    }
  };

  const upsertSummary = (employeeId, summary) => {
    setSummaries((prev) => {
      const next = prev.filter((item) => item.employee_id !== employeeId);

      if (summary) {
        next.push(summary);
        next.sort(
          (a, b) => new Date(b.submitted_at || 0) - new Date(a.submitted_at || 0)
        );
      }

      return next;
    });
  };

  const fetchEmployeeResults = async (employee) => {
    if (!employee) return;

    try {
      setResultsLoading(true);
      setResultsError('');
      setEmployeeResults([]);
      setSelectedResultId(null);
      setResultDetail(null);
      setDetailError('');

      const response = await axios.get(`/manager-evaluations/employee/${employee.id}/results`);
      const data = response.data?.data || [];
      setEmployeeResults(data);

      if (data.length > 0) {
        const latest = data[0];
        setSelectedResultId(latest.id);
        upsertSummary(employee.id, {
          employee_id: employee.id,
          evaluation_id: latest.id,
          submitted_at: latest.submitted_at,
          total_score: latest.total_score,
          average_score: latest.average_score,
          percentage: latest.percentage,
          is_passed: latest.is_passed,
          passing_score: latest.passing_score,
          form_title: latest.form_title,
          manager: latest.manager,
        });
      } else {
        upsertSummary(employee.id, null);
      }
    } catch (error) {
      console.error('Failed to load employee evaluation results:', error);
      setResultsError(
        error.response?.data?.message ||
          error.message ||
          'Unable to load evaluation results for this employee.'
      );
    } finally {
      setResultsLoading(false);
    }
  };

  const fetchResultDetail = async (resultId) => {
    if (!resultId) return;

    try {
      setDetailLoading(true);
      setDetailError('');
      setResultDetail(null);

      const response = await axios.get(`/manager-evaluations/result/${resultId}`);
      setResultDetail(response.data?.data || null);
    } catch (error) {
      console.error('Failed to load evaluation detail:', error);
      setDetailError(
        error.response?.data?.message ||
          error.message ||
          'Unable to load the selected evaluation detail.'
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!selectedResultId) return;

    try {
      setDetailError('');
      const response = await axios.get(`/manager-evaluations/result/${selectedResultId}/pdf`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `evaluation_result_${selectedResultId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download evaluation PDF:', error);
      setDetailError(
        error.response?.data?.message ||
          error.message ||
          'Unable to download the evaluation PDF. Please try again.'
      );
    }
  };

  const filteredEmployees = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return employees.filter((employee) => {
      const name = employee.name?.toLowerCase() || '';
      const department = employee.department?.toLowerCase() || '';
      const matchesSearch =
        !query ||
        name.includes(query) ||
        employee.employee_id?.toLowerCase().includes(query);
      const matchesDepartment =
        departmentFilter === 'all' || department === departmentFilter.toLowerCase();
      return matchesSearch && matchesDepartment;
    });
  }, [employees, searchQuery, departmentFilter]);

  const departmentOptions = useMemo(() => {
    const unique = new Set();
    employees.forEach((employee) => {
      if (employee.department) {
        unique.add(employee.department);
      }
    });
    return Array.from(unique).sort();
  }, [employees]);

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const formatScore = (score) => {
    if (score === null || score === undefined) return '—';
    return Number(score).toFixed(2);
  };

  const statCards = [
    {
      title: 'Employees Evaluated',
      value: summaryStats.totalEvaluated,
      caption: 'Completed at least one evaluation',
      icon: <FaMedal size={22} />,
      gradient: 'linear-gradient(135deg, #4f46e5, #6366f1)',
    },
    {
      title: 'Average Score',
      value:
        summaryStats.averageScore !== null
          ? `${summaryStats.averageScore.toFixed(2)} / 10`
          : '—',
      caption: 'Across latest evaluations',
      icon: <FaChartLine size={22} />,
      gradient: 'linear-gradient(135deg, #0284c7, #38bdf8)',
    },
    {
      title: 'Latest Evaluation',
      value: summaryStats.lastUpdated ? formatDate(summaryStats.lastUpdated) : '—',
      caption: 'Most recent submission',
      icon: <FaCalendarCheck size={22} />,
      gradient: 'linear-gradient(135deg, #16a34a, #4ade80)',
    },
  ];

  return (
    <Container
      fluid
      className="py-4 evaluation-results-page"
      style={{ background: '#f6f8fb', minHeight: '100vh' }}
    >
      <Row>
        <Col xs={12}>
          <Card className="border-0 shadow-sm mb-4">
            <Card.Body className="d-flex flex-wrap align-items-center justify-content-between gap-3 py-4">
              <div>
                <h2 className="mb-1 fw-bold text-primary">Employee Evaluation Results</h2>
                <p className="text-muted mb-0">
                  Review submitted performance evaluations and drill down into detailed results.
                </p>
              </div>
              <div className="d-flex gap-2">
                <Button
                  variant="outline-primary"
                  onClick={fetchEmployees}
                  disabled={loading || summaryLoading}
                >
                  <FaRedo className="me-2" /> Refresh
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {(pageError || summaryError) && (
        <Row className="mb-3">
          <Col>
            <Alert variant="danger" className="mb-0">
              {pageError || summaryError}
            </Alert>
          </Col>
        </Row>
      )}

      <Row className="g-3 mb-4">
        {statCards.map((card, idx) => (
          <Col key={card.title} md={4} sm={12}>
            <Card
              className="h-100 border-0 shadow-sm text-white position-relative overflow-hidden"
              style={{ background: card.gradient }}
            >
              <Card.Body className="d-flex flex-column justify-content-between">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center"
                    style={{
                      width: 44,
                      height: 44,
                      backgroundColor: 'rgba(255,255,255,0.15)',
                    }}
                  >
                    {card.icon}
                  </div>
                  {summaryLoading && idx === 0 && (
                    <Spinner animation="border" size="sm" className="text-white" />
                  )}
                </div>
                <div>
                  <div className="text-uppercase small fw-semibold" style={{ opacity: 0.75 }}>
                    {card.title}
                  </div>
                  <div className="display-6 fw-bold">{card.value}</div>
                  <div className="small mt-1" style={{ opacity: 0.85 }}>
                    {card.caption}
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <Row className="g-4">
        <Col lg={12}>
          <Card className="mb-4 shadow-sm border-0">
            <Card.Header className="bg-white border-0 py-3 px-3">
              <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-2 fw-semibold text-primary">
                  <FaUserTie />
                  <span>Employees</span>
                </div>
                <div className="d-flex gap-2 flex-wrap">
                  <Form.Control
                    size="sm"
                    type="text"
                    placeholder="Search employee"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ minWidth: 180 }}
                  />
                  <Form.Select
                    size="sm"
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    style={{ minWidth: 160 }}
                  >
                    <option value="all">All departments</option>
                    {departmentOptions.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </Form.Select>
                </div>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              {loading ? (
                <div className="d-flex align-items-center justify-content-center py-5">
                  <Spinner animation="border" size="sm" className="me-2" />
                  Loading employees...
                </div>
              ) : filteredEmployees.length === 0 ? (
                <div className="text-center text-muted py-5">
                  <FaSearch className="mb-2" size={22} />
                  <div>No employees matched your filters.</div>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table hover className="mb-0 align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>Name</th>
                        <th>Department</th>
                        <th>Last Evaluation</th>
                        <th className="text-end">Action</th>
                      </tr>
                    </thead>
                    <tbody>
              {filteredEmployees.map((employee) => {
                const isSelected = modalEmployee?.id === employee.id;
                        const summary = summaryMap.get(employee.id);

                        return (
                          <tr
                            key={employee.id}
                            className={isSelected ? 'table-primary' : ''}
                            style={{ cursor: 'pointer' }}
                            onClick={() => setModalEmployee(employee)}
                          >
                            <td>
                              <div className="fw-semibold">{employee.name}</div>
                              <div className="small text-muted">{employee.position || '—'}</div>
                            </td>
                            <td>
                              <span className="badge bg-light text-dark fw-semibold">
                                {employee.department || '—'}
                              </span>
                            </td>
                            <td>
                              {summary ? (
                                <div className="d-flex flex-column gap-1">
                                  <div className="d-flex align-items-center gap-2">
                                    <span className="fw-semibold">
                                      {formatDate(summary.submitted_at)}
                                    </span>
                                    <Badge bg={summary.is_passed ? 'success' : 'danger'}>
                                      {summary.is_passed ? 'Passed' : 'Failed'}
                                    </Badge>
                                  </div>
                                  <div className="small text-muted">
                                    Score: {formatScore(summary.average_score)} / 10
                                  </div>
                                  {summary.form_title && (
                                    <div className="small text-muted">
                                      {summary.form_title}
                                    </div>
                                  )}
                                </div>
                              ) : summaryLoading ? (
                                <span className="text-muted small d-inline-flex align-items-center gap-2">
                                  <Spinner animation="border" size="sm" />
                                  Loading...
                                </span>
                              ) : (
                                <span className="text-muted small">No evaluations yet</span>
                              )}
                            </td>
                            <td className="text-end">
                              <Button
                                variant={isSelected ? 'primary' : 'outline-primary'}
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setModalEmployee(employee);
                                }}
                              >
                                <FaHistory className="me-2" size={12} />
                                View Results
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Modal
          show={showResultModal}
          onHide={() => {
            setModalEmployee(null);
          }}
          size="xl"
          centered
          dialogClassName="evaluation-result-modal"
        >
          <Modal.Header closeButton className="border-0">
            <div>
              <h5 className="mb-1">
                {modalEmployee?.name || 'Evaluation Results'}
              </h5>
              <div className="small text-muted">
                {modalEmployee?.department || 'No department'} •{' '}
                {modalEmployee?.position || 'No position'}
              </div>
            </div>
          </Modal.Header>
          <Modal.Body className="pt-0">
            <div className="d-flex gap-2 flex-wrap mb-3">
              <Form.Select
                size="sm"
                value={selectedResultId || ''}
                onChange={(e) => setSelectedResultId(Number(e.target.value))}
                disabled={resultsLoading || employeeResults.length === 0}
                style={{ minWidth: 220 }}
              >
                {employeeResults.length === 0 && (
                  <option value="">No evaluations available</option>
                )}
                {employeeResults.map((result) => (
                  <option key={result.id} value={result.id}>
                    {formatDate(result.submitted_at)} • {formatScore(result.average_score)} / 10
                  </option>
                ))}
              </Form.Select>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => modalEmployee && fetchEmployeeResults(modalEmployee)}
                disabled={resultsLoading}
              >
                <FaRedo size={12} className="me-2" />
                Refresh
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleDownloadPdf}
                disabled={!selectedResultId || detailLoading}
              >
                <FaDownload size={12} className="me-2" />
                Download PDF
              </Button>
            </div>

            {resultsError && (
              <Alert variant="danger" className="mb-3">
                {resultsError}
              </Alert>
            )}

            {detailError && (
              <Alert variant="danger" className="mb-3">
                {detailError}
              </Alert>
            )}

            {resultsLoading ? (
              <div className="d-flex align-items-center justify-content-center py-5">
                <Spinner animation="border" size="sm" className="me-2" />
                Loading evaluation history...
              </div>
            ) : employeeResults.length === 0 ? (
              <div className="text-center text-muted py-5">
                This employee has no completed evaluations yet.
              </div>
            ) : detailLoading || !resultDetail ? (
              <div className="d-flex align-items-center justify-content-center py-5">
                <Spinner animation="border" size="sm" className="me-2" />
                Loading evaluation details...
              </div>
            ) : (
              <div style={{ maxHeight: '65vh', overflowY: 'auto' }}>
                <EvaluationResult
                  result={resultDetail}
                  onBack={null}
                  showBackButton={false}
                />
              </div>
            )}
          </Modal.Body>
          {employeeResults.length > 0 && (
            <Modal.Footer className="bg-light border-0 flex-wrap">
              {employeeResults.map((result) => {
                const variant = result.id === selectedResultId ? 'primary' : 'secondary';
                return (
                  <Badge
                    key={result.id}
                    bg={variant}
                    pill
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedResultId(result.id)}
                  >
                    {formatDate(result.submitted_at)} • {formatScore(result.average_score)}
                  </Badge>
                );
              })}
            </Modal.Footer>
          )}
        </Modal>
      </Row>
    </Container>
  );
};

export default EvaluationResults;

