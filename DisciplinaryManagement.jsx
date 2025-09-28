import React, { useState, useEffect } from 'react';
import { Tabs, Tab, Box, Typography, Button, IconButton, Chip } from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, ToggleOff, ToggleOn } from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import axios from 'axios';

const DisciplinaryManagement = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [categories, setCategories] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Tab 1: Disciplinary Categories Administration
  const categoriesColumns = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'name', headerName: 'Category Name', width: 200 },
    { field: 'description', headerName: 'Description', width: 300 },
    { 
      field: 'severity_level', 
      headerName: 'Severity', 
      width: 120,
      renderCell: (params) => (
        <Chip 
          label={params.value} 
          color={
            params.value === 'severe' ? 'error' : 
            params.value === 'major' ? 'warning' : 'default'
          }
          size="small"
        />
      )
    },
    { field: 'disciplinary_reports_count', headerName: 'Used In Reports', width: 130 },
    {
      field: 'is_active',
      headerName: 'Status',
      width: 100,
      renderCell: (params) => (
        <Chip 
          label={params.value ? 'Active' : 'Inactive'} 
          color={params.value ? 'success' : 'default'}
          size="small"
        />
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      renderCell: (params) => (
        <Box>
          <IconButton 
            size="small" 
            onClick={() => handleEditCategory(params.row)}
            color="primary"
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton 
            size="small" 
            onClick={() => handleToggleCategoryStatus(params.row.id)}
            color="secondary"
          >
            {params.row.is_active ? <ToggleOn /> : <ToggleOff />}
          </IconButton>
          <IconButton 
            size="small" 
            onClick={() => handleDeleteCategory(params.row.id)}
            color="error"
            disabled={params.row.disciplinary_reports_count > 0}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      )
    }
  ];

  // Tab 2: Reported Infractions/Violations
  const reportsColumns = [
    { field: 'report_number', headerName: 'Report #', width: 120 },
    { 
      field: 'employee', 
      headerName: 'Employee', 
      width: 200,
      valueGetter: (params) => `${params.value?.first_name} ${params.value?.last_name} (${params.value?.employee_id})`
    },
    { 
      field: 'disciplinary_category', 
      headerName: 'Violation Category', 
      width: 150,
      valueGetter: (params) => params.value?.name
    },
    { 
      field: 'severity_level', 
      headerName: 'Severity', 
      width: 100,
      valueGetter: (params) => params.row.disciplinary_category?.severity_level,
      renderCell: (params) => (
        <Chip 
          label={params.value} 
          color={
            params.value === 'severe' ? 'error' : 
            params.value === 'major' ? 'warning' : 'default'
          }
          size="small"
        />
      )
    },
    { 
      field: 'priority', 
      headerName: 'Priority', 
      width: 100,
      renderCell: (params) => (
        <Chip 
          label={params.value} 
          color={
            params.value === 'urgent' ? 'error' : 
            params.value === 'high' ? 'warning' : 
            params.value === 'medium' ? 'primary' : 'default'
          }
          size="small"
        />
      )
    },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 130,
      renderCell: (params) => (
        <Chip 
          label={params.value.replace('_', ' ').toUpperCase()} 
          color={
            params.value === 'completed' ? 'success' : 
            params.value === 'reported' ? 'warning' : 'primary'
          }
          size="small"
        />
      )
    },
    { field: 'incident_date', headerName: 'Incident Date', width: 120 },
    { 
      field: 'reporter', 
      headerName: 'Reported By', 
      width: 150,
      valueGetter: (params) => `${params.value?.first_name} ${params.value?.last_name}`
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 200,
      renderCell: (params) => (
        <Box>
          <Button 
            size="small" 
            onClick={() => handleViewReport(params.row.id)}
            variant="outlined"
            sx={{ mr: 1 }}
          >
            View
          </Button>
          {params.row.status === 'reported' && (
            <Button 
              size="small" 
              onClick={() => handleIssueAction(params.row)}
              variant="contained"
              color="primary"
            >
              Issue Action
            </Button>
          )}
        </Box>
      )
    }
  ];

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === 0) {
      loadCategories();
    } else {
      loadReports();
    }
  }, [activeTab]);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/hr/disciplinary/categories');
      setCategories(response.data.data.data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
    setLoading(false);
  };

  const loadReports = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/hr/disciplinary/reports');
      setReports(response.data.data.data || []);
    } catch (error) {
      console.error('Error loading reports:', error);
    }
    setLoading(false);
  };

  // Category management handlers
  const handleAddCategory = () => {
    // Open add category modal/form
    console.log('Add new category');
  };

  const handleEditCategory = (category) => {
    // Open edit category modal/form
    console.log('Edit category:', category);
  };

  const handleDeleteCategory = async (categoryId) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        await axios.delete(`/api/hr/disciplinary/categories/${categoryId}`);
        loadCategories(); // Refresh the list
      } catch (error) {
        console.error('Error deleting category:', error);
        alert('Error deleting category. It may be in use by existing reports.');
      }
    }
  };

  const handleToggleCategoryStatus = async (categoryId) => {
    try {
      await axios.patch(`/api/hr/disciplinary/categories/${categoryId}/toggle-status`);
      loadCategories(); // Refresh the list
    } catch (error) {
      console.error('Error toggling category status:', error);
    }
  };

  // Report management handlers
  const handleViewReport = (reportId) => {
    // Open detailed report view
    console.log('View report:', reportId);
  };

  const handleIssueAction = (report) => {
    // Open disciplinary action form
    console.log('Issue action for report:', report);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Disciplinary Management
      </Typography>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Disciplinary Action Administration" />
          <Tab label="Reported Infractions" />
        </Tabs>
      </Box>
      
      {/* Tab 1: Category Administration */}
      <Box
        role="tabpanel"
        hidden={activeTab !== 0}
        sx={{ mt: 2 }}
      >
        {activeTab === 0 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">
                Disciplinary Categories Management
              </Typography>
              <Button 
                variant="contained" 
                startIcon={<AddIcon />}
                onClick={handleAddCategory}
              >
                Add New Category
              </Button>
            </Box>
            
            <DataGrid
              rows={categories}
              columns={categoriesColumns}
              pageSize={15}
              rowsPerPageOptions={[15, 25, 50]}
              loading={loading}
              autoHeight
              disableSelectionOnClick
            />
          </Box>
        )}
      </Box>
      
      {/* Tab 2: Reported Infractions */}
      <Box
        role="tabpanel"
        hidden={activeTab !== 1}
        sx={{ mt: 2 }}
      >
        {activeTab === 1 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">
                Employee Infractions & Violations
              </Typography>
              {/* Add filters here - Status, Priority, Date Range, etc. */}
            </Box>
            
            <DataGrid
              rows={reports}
              columns={reportsColumns}
              pageSize={15}
              rowsPerPageOptions={[15, 25, 50]}
              loading={loading}
              autoHeight
              disableSelectionOnClick
            />
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default DisciplinaryManagement;