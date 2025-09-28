import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Nav, Tab, Alert, Spinner } from 'react-bootstrap';
import DisciplinaryCategoriesTab from './DisciplinaryTabs/DisciplinaryCategoriesTab';
import ReportedInfractionsTab from './DisciplinaryTabs/ReportedInfractionsTab';
import './DisciplinaryManagement.css';

const DisciplinaryManagement = () => {
  const [activeTab, setActiveTab] = useState('categories');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Component mounted successfully
    console.log('DisciplinaryManagement component mounted');
    
    // Simulate loading and check for any initialization errors
    const timer = setTimeout(() => {
      try {
        setLoading(false);
        console.log('DisciplinaryManagement initialized successfully');
      } catch (err) {
        console.error('Error initializing DisciplinaryManagement:', err);
        setError(err.message);
        setLoading(false);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Show loading state
  if (loading) {
    return (
      <Container fluid className="disciplinary-management">
        <Row>
          <Col>
            <div className="text-center py-5">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
              <p className="mt-3">Initializing Disciplinary Management...</p>
            </div>
          </Col>
        </Row>
      </Container>
    );
  }

  // Show error state
  if (error) {
    return (
      <Container fluid className="disciplinary-management">
        <Row>
          <Col>
            <Alert variant="danger">
              <Alert.Heading>Error Loading Disciplinary Management</Alert.Heading>
              <p>{error}</p>
            </Alert>
          </Col>
        </Row>
      </Container>
    );
  }

  return (
    <Container fluid className="disciplinary-management">
      <Row>
        <Col>

          <Tab.Container activeKey={activeTab} onSelect={setActiveTab}>
            <Nav variant="tabs" className="mb-4">
              <Nav.Item>
                <Nav.Link eventKey="categories">
                  <i className="fas fa-list me-2"></i>
                  Disciplinary Action Administration
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="reports">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  Reported Infractions
                </Nav.Link>
              </Nav.Item>
            </Nav>

            <Tab.Content>
              <Tab.Pane eventKey="categories">
                <DisciplinaryCategoriesTab />
              </Tab.Pane>
              <Tab.Pane eventKey="reports">
                <ReportedInfractionsTab />
              </Tab.Pane>
            </Tab.Content>
          </Tab.Container>
        </Col>
      </Row>
    </Container>
  );
};

export default DisciplinaryManagement;