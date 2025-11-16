import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus, faEdit, faTrash, faTimes, faSave, faSpinner,
  faBuilding, faUser, faChevronRight, faChevronDown
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import './DepartmentPositionManagement.css';

// Scroll lock utility
const useScrollLock = () => {
  const lockScroll = () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollTop}px`;
    document.body.style.width = '100%';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
  };

  const unlockScroll = () => {
    const scrollTop = document.body.style.top;
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.paddingRight = '';
    window.scrollTo(0, parseInt(scrollTop || '0') * -1);
  };

  return { lockScroll, unlockScroll };
};


const DepartmentPositionManagement = () => {
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [showEditDeptModal, setShowEditDeptModal] = useState(false);
  const [showAddPosModal, setShowAddPosModal] = useState(false);
  const [showEditPosModal, setShowEditPosModal] = useState(false);
  const [showDeleteDeptModal, setShowDeleteDeptModal] = useState(false);
  const [showDeletePosModal, setShowDeletePosModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [expandedDepts, setExpandedDepts] = useState(new Set());
  const deleteItemRef = useRef(null); // Ref to store item for immediate access

  // Form states
  const [deptFormData, setDeptFormData] = useState({
    name: '',
    description: ''
  });

  const [posFormData, setPosFormData] = useState({
    name: '',
    description: '',
    department_id: ''
  });

  useEffect(() => {
    fetchDepartments();
    fetchPositions();
  }, []);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:8000/api/departments');
      setDepartments(response.data);
    } catch (error) {
      console.error('Error fetching departments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPositions = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/positions');
      setPositions(response.data);
    } catch (error) {
      console.error('Error fetching positions:', error);
    }
  };

  const getPositionsByDepartment = (departmentId) => {
    return positions.filter(pos => pos.department_id === departmentId);
  };

  const toggleDepartmentExpansion = (deptId) => {
    const newExpanded = new Set(expandedDepts);
    if (newExpanded.has(deptId)) {
      newExpanded.delete(deptId);
    } else {
      newExpanded.add(deptId);
    }
    setExpandedDepts(newExpanded);
  };

  const handleAddDepartment = () => {
    setDeptFormData({ name: '', description: '' });
    setShowAddDeptModal(true);
  };

  const handleEditDepartment = (department) => {
    setSelectedItem(department);
    setDeptFormData({
      name: department.name,
      description: department.description || ''
    });
    setShowEditDeptModal(true);
  };

  const handleDeleteDepartment = (department) => {
    deleteItemRef.current = department; // Store in ref for immediate access
    setSelectedItem(department);
    setShowDeleteDeptModal(true);
  };

  const handleAddPosition = (departmentId) => {
    setPosFormData({
      name: '',
      description: '',
      department_id: departmentId
    });
    setShowAddPosModal(true);
  };

  const handleEditPosition = (position) => {
    setSelectedItem(position);
    setPosFormData({
      name: position.name,
      description: position.description || '',
      department_id: position.department_id
    });
    setShowEditPosModal(true);
  };

  const handleDeletePosition = (position) => {
    deleteItemRef.current = position; // Store in ref for immediate access
    setSelectedItem(position);
    setShowDeletePosModal(true);
  };

  const handleDepartmentSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      
      if (showAddDeptModal) {
        await axios.post('http://localhost:8000/api/departments', deptFormData);
      } else if (showEditDeptModal) {
        await axios.put(`http://localhost:8000/api/departments/${selectedItem.id}`, deptFormData);
      }
      
      await fetchDepartments();
      setShowAddDeptModal(false);
      setShowEditDeptModal(false);
      setDeptFormData({ name: '', description: '' });
    } catch (error) {
      console.error('Error saving department:', error);
    } finally {
      setSaving(false);
    }
  };

  const handlePositionSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      
      if (showAddPosModal) {
        await axios.post('http://localhost:8000/api/positions', posFormData);
      } else if (showEditPosModal) {
        await axios.put(`http://localhost:8000/api/positions/${selectedItem.id}`, posFormData);
      }
      
      await fetchPositions();
      setShowAddPosModal(false);
      setShowEditPosModal(false);
      setPosFormData({ name: '', description: '', department_id: '' });
    } catch (error) {
      console.error('Error saving position:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDepartmentConfirm = async () => {
    // Use ref first (immediate), fallback to state if ref is not set
    const itemToDelete = deleteItemRef.current || selectedItem;
    if (!itemToDelete || !itemToDelete.id) return;
    
    const itemId = itemToDelete.id;
    
    try {
      setSaving(true);
      await axios.delete(`http://localhost:8000/api/departments/${itemId}`);
      await fetchDepartments();
      await fetchPositions();
      setShowDeleteDeptModal(false);
      setSelectedItem(null);
      deleteItemRef.current = null; // Clear ref after delete
    } catch (error) {
      console.error('Error deleting department:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePositionConfirm = async () => {
    // Use ref first (immediate), fallback to state if ref is not set
    const itemToDelete = deleteItemRef.current || selectedItem;
    if (!itemToDelete || !itemToDelete.id) return;
    
    const itemId = itemToDelete.id;
    
    try {
      setSaving(true);
      await axios.delete(`http://localhost:8000/api/positions/${itemId}`);
      await fetchPositions();
      setShowDeletePosModal(false);
      setSelectedItem(null);
      deleteItemRef.current = null; // Clear ref after delete
    } catch (error) {
      console.error('Error deleting position:', error);
    } finally {
      setSaving(false);
    }
  };

  const Modal = ({ isOpen, onClose, title, children, contentClassName }) => {
    const { lockScroll, unlockScroll } = useScrollLock();

    useEffect(() => {
      if (isOpen) {
        lockScroll();
      }
      return () => {
        if (isOpen) {
          unlockScroll();
        }
      };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className={`modal-content ${contentClassName || ''}`} onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3>{title}</h3>
            <button type="button" className="modal-close" onClick={onClose}>
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
          {children}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="dept-pos-loading">
        <FontAwesomeIcon icon={faSpinner} spin />
        <p>Loading departments and positions...</p>
      </div>
    );
  }

  return (
    <div className="dept-pos-management">
      <div className="dept-pos-header">
        <div className="header-content">
          <h1>Department & Position Management</h1>
          <p>Organize departments and their corresponding positions</p>
        </div>
        <button type="button" className="add-dept-btn" onClick={handleAddDepartment}>
          <FontAwesomeIcon icon={faPlus} />
          Add Department
        </button>
      </div>

      <div className="dept-pos-layout">
        {/* Left Panel - Departments */}
        <div className="departments-panel">
          <div className="panel-header">
            <h3>
              <FontAwesomeIcon icon={faBuilding} />
              Departments
            </h3>
            <span className="count">{departments.length}</span>
          </div>
          
          <div className="departments-list">
            {departments.map(department => (
              <div key={department.id} className="department-item">
                <div 
                  className="department-header"
                  onClick={() => toggleDepartmentExpansion(department.id)}
                >
                  <div className="department-info">
                    <FontAwesomeIcon 
                      icon={expandedDepts.has(department.id) ? faChevronDown : faChevronRight} 
                      className="expand-icon"
                    />
                    <span className="department-name">{department.name}</span>
                  </div>
                  <div className="department-actions">
                    <button
                      type="button"
                      className="action-btn add-pos-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddPosition(department.id);
                      }}
                      title="Add Position"
                    >
                      <FontAwesomeIcon icon={faPlus} />
                    </button>
                    <button
                      type="button"
                      className="action-btn edit-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditDepartment(department);
                      }}
                      title="Edit Department"
                    >
                      <FontAwesomeIcon icon={faEdit} />
                    </button>
                    <button
                      type="button"
                      className="action-btn delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDepartment(department);
                      }}
                      title="Delete Department"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                </div>
                
                {expandedDepts.has(department.id) && (
                  <div className="positions-list">
                    {getPositionsByDepartment(department.id).map(position => (
                      <div key={position.id} className="position-item">
                        <div className="position-info">
                          <FontAwesomeIcon icon={faUser} className="position-icon" />
                          <span className="position-name">{position.name}</span>
                        </div>
                        <div className="position-actions">
                          <button
                            type="button"
                            className="action-btn edit-btn"
                            onClick={() => handleEditPosition(position)}
                            title="Edit Position"
                          >
                            <FontAwesomeIcon icon={faEdit} />
                          </button>
                          <button
                            type="button"
                            className="action-btn delete-btn"
                            onClick={() => handleDeletePosition(position)}
                            title="Delete Position"
                          >
                            <FontAwesomeIcon icon={faTrash} />
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    {getPositionsByDepartment(department.id).length === 0 && (
                      <div className="no-positions">
                        <p>No positions in this department</p>
                        <button
                          type="button"
                          className="add-first-position-btn"
                          onClick={() => handleAddPosition(department.id)}
                        >
                          <FontAwesomeIcon icon={faPlus} />
                          Add First Position
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            
            {departments.length === 0 && (
              <div className="no-departments">
                <FontAwesomeIcon icon={faBuilding} />
                <p>No departments found</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Selected Department Details */}
        <div className="details-panel">
          {selectedDepartment ? (
            <div className="department-details">
              <h3>{selectedDepartment.name}</h3>
              <p>{selectedDepartment.description || 'No description provided'}</p>
              <div className="positions-count">
                <FontAwesomeIcon icon={faUser} />
                <span>{getPositionsByDepartment(selectedDepartment.id).length} positions</span>
              </div>
            </div>
          ) : (
            <div className="no-selection">
              <FontAwesomeIcon icon={faBuilding} />
              <p>Select a department to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Department Modal */}
      <Modal
        isOpen={showAddDeptModal || showEditDeptModal}
        onClose={() => {
          setShowAddDeptModal(false);
          setShowEditDeptModal(false);
        }}
        title={showAddDeptModal ? 'Add Department' : 'Edit Department'}
        contentClassName="no-scroll"
      >
        <form onSubmit={handleDepartmentSubmit} className="dept-form">
          <div className="form-group">
            <label>Department Name</label>
            <input
              type="text"
              value={deptFormData.name}
              onChange={(e) => setDeptFormData(prev => ({ ...prev, name: e.target.value }))}
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.stopPropagation();
              }}
              required
              placeholder="Enter department name"
              autoFocus
            />
          </div>
          
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={deptFormData.description}
              onChange={(e) => setDeptFormData(prev => ({ ...prev, description: e.target.value }))}
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.stopPropagation();
              }}
              placeholder="Enter department description"
              rows="3"
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="cancel-btn"
              onClick={() => {
                setShowAddDeptModal(false);
                setShowEditDeptModal(false);
              }}
            >
              Cancel
            </button>
            <button type="submit" className="save-btn" disabled={saving}>
              {saving ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faSave} />}
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add/Edit Position Modal */}
      <Modal
        isOpen={showAddPosModal || showEditPosModal}
        onClose={() => {
          setShowAddPosModal(false);
          setShowEditPosModal(false);
        }}
        title={showAddPosModal ? 'Add Position' : 'Edit Position'}
        contentClassName="no-scroll"
      >
        <form onSubmit={handlePositionSubmit} className="pos-form">
          <div className="form-group">
            <label>Position Name</label>
            <input
              type="text"
              value={posFormData.name}
              onChange={(e) => setPosFormData(prev => ({ ...prev, name: e.target.value }))}
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.stopPropagation();
              }}
              required
              placeholder="Enter position name"
              autoFocus
            />
          </div>
          
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={posFormData.description}
              onChange={(e) => setPosFormData(prev => ({ ...prev, description: e.target.value }))}
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.stopPropagation();
              }}
              placeholder="Enter position description"
              rows="3"
            />
          </div>

          <div className="form-group">
            <label>Department</label>
            <select
              value={posFormData.department_id}
              onChange={(e) => setPosFormData(prev => ({ ...prev, department_id: e.target.value }))}
              required
            >
              <option value="">Select Department</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="cancel-btn"
              onClick={() => {
                setShowAddPosModal(false);
                setShowEditPosModal(false);
              }}
            >
              Cancel
            </button>
            <button type="submit" className="save-btn" disabled={saving}>
              {saving ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faSave} />}
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Department Modal */}
      <Modal
        isOpen={showDeleteDeptModal}
        onClose={() => {
          setShowDeleteDeptModal(false);
          deleteItemRef.current = null; // Clear ref when modal closes
        }}
        title="Delete Department"
      >
        <div className="delete-confirmation">
          <p>Are you sure you want to delete <strong>{selectedItem?.name}</strong>?</p>
          <p className="warning-text">This will also delete all positions in this department. This action cannot be undone.</p>
          <div className="form-actions">
            <button
              type="button"
              className="cancel-btn"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowDeleteDeptModal(false);
                deleteItemRef.current = null; // Clear ref on cancel
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="delete-btn"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDeleteDepartmentConfirm();
              }}
              disabled={saving}
            >
              {saving ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faTrash} />}
              {saving ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Position Modal */}
      <Modal
        isOpen={showDeletePosModal}
        onClose={() => {
          setShowDeletePosModal(false);
          deleteItemRef.current = null; // Clear ref when modal closes
        }}
        title="Delete Position"
      >
        <div className="delete-confirmation">
          <p>Are you sure you want to delete <strong>{selectedItem?.name}</strong>?</p>
          <p className="warning-text">This action cannot be undone.</p>
          <div className="form-actions">
            <button
              type="button"
              className="cancel-btn"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowDeletePosModal(false);
                deleteItemRef.current = null; // Clear ref on cancel
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="delete-btn"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDeletePositionConfirm();
              }}
              disabled={saving}
            >
              {saving ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faTrash} />}
              {saving ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DepartmentPositionManagement;
