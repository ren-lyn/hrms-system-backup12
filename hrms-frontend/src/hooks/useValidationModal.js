import { useState, useCallback } from 'react';

const useValidationModal = () => {
  const [modalState, setModalState] = useState({
    show: false,
    type: 'success',
    title: '',
    message: ''
  });

  const showModal = useCallback((type, message, title = null) => {
    setModalState({
      show: true,
      type,
      message,
      title
    });
  }, []);

  const hideModal = useCallback(() => {
    setModalState(prev => ({
      ...prev,
      show: false
    }));
  }, []);

  const showSuccess = useCallback((message, title = null) => {
    showModal('success', message, title);
  }, [showModal]);

  const showError = useCallback((message, title = null) => {
    showModal('error', message, title);
  }, [showModal]);

  const showWarning = useCallback((message, title = null) => {
    showModal('warning', message, title);
  }, [showModal]);

  const showInfo = useCallback((message, title = null) => {
    showModal('info', message, title);
  }, [showModal]);

  return {
    modalState,
    showModal,
    hideModal,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };
};

export default useValidationModal;
