// Comprehensive data validation rules for onboarding process

export const validateDocumentUpload = (file) => {
  const errors = {};
  
  // Check file type
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  if (!allowedTypes.includes(file.type)) {
    errors.type = 'Please upload a valid document (PDF, JPG, or PNG)';
  }
  
  // Check file size (5MB = 5 * 1024 * 1024 bytes)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    errors.size = 'File size exceeds 5MB limit';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateEmployeeProfile = (profileData) => {
  const errors = {};
  
  // Full Name validation
  if (!profileData.fullName || profileData.fullName.trim().length < 2) {
    errors.fullName = 'Full name is required';
  } else {
    const nameWords = profileData.fullName.trim().split(' ');
    if (nameWords.length < 2) {
      errors.fullName = 'Full name must contain at least 2 words';
    }
    if (!/^[a-zA-Z\s]+$/.test(profileData.fullName)) {
      errors.fullName = 'Full name must contain letters only';
    }
  }
  
  // Age validation (auto-calculated, must be 18+)
  if (profileData.birthDate) {
    const birthDate = new Date(profileData.birthDate);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    if (age < 18) {
      errors.birthDate = 'Employee must be at least 18 years old';
    }
  }
  
  // Contact validation (PH format)
  if (profileData.contact) {
    const phoneRegex = /^(\+63|09)\d{9}$/;
    if (!phoneRegex.test(profileData.contact.replace(/[-\s]/g, ''))) {
      errors.contact = 'Please enter a valid Philippine phone number (+63 or 09XX-XXX-XXXX)';
    }
  }
  
  // SSS validation
  if (profileData.sss) {
    const sssRegex = /^\d{2}-\d{7}-\d{1}$/;
    if (!sssRegex.test(profileData.sss)) {
      errors.sss = 'SSS format must be XX-XXXXXXX-X';
    }
  }
  
  // PhilHealth validation
  if (profileData.philhealth) {
    const philhealthRegex = /^\d{2}-\d{9}-\d{1}$/;
    if (!philhealthRegex.test(profileData.philhealth)) {
      errors.philhealth = 'PhilHealth format must be XX-XXXXXXXXX-X';
    }
  }
  
  // Pag-IBIG validation
  if (profileData.pagibig) {
    const pagibigRegex = /^\d{4}-\d{4}-\d{4}$/;
    if (!pagibigRegex.test(profileData.pagibig)) {
      errors.pagibig = 'Pag-IBIG format must be XXXX-XXXX-XXXX';
    }
  }
  
  // TIN validation
  if (profileData.tin) {
    const tinRegex = /^\d{3}-\d{3}-\d{3}-\d{3}$/;
    if (!tinRegex.test(profileData.tin)) {
      errors.tin = 'TIN format must be XXX-XXX-XXX-XXX';
    }
  }
  
  // Date Hired validation
  if (profileData.dateHired) {
    const hiredDate = new Date(profileData.dateHired);
    const today = new Date();
    if (hiredDate > today) {
      errors.dateHired = 'Date hired cannot be in the future';
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateOrientationScheduling = (scheduleData) => {
  const errors = {};
  
  // Date validation
  if (!scheduleData.date) {
    errors.date = 'Date is required';
  } else {
    const selectedDate = new Date(scheduleData.date);
    const today = new Date();
    const maxDate = new Date();
    maxDate.setDate(today.getDate() + 90);
    
    if (selectedDate <= today) {
      errors.date = 'Please select a valid date in the future';
    } else if (selectedDate > maxDate) {
      errors.date = 'Date cannot be more than 90 days in the future';
    }
  }
  
  // Time validation
  if (!scheduleData.time) {
    errors.time = 'Time is required';
  }
  
  // Location validation
  if (!scheduleData.location || scheduleData.location.trim().length < 5) {
    errors.location = 'Location must be at least 5 characters';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateStartingDate = (startDate, hireDate) => {
  const errors = {};
  
  if (!startDate) {
    errors.startDate = 'Starting date is required';
  } else {
    const selectedDate = new Date(startDate);
    const today = new Date();
    const hireDateObj = new Date(hireDate);
    
    if (selectedDate < today) {
      errors.startDate = 'Starting date cannot be in the past';
    }
    
    if (selectedDate < hireDateObj) {
      errors.startDate = 'Starting date must be on or after hire date';
    }
    
    // Warning for >30 days from hire date
    const daysDiff = Math.ceil((selectedDate - hireDateObj) / (1000 * 60 * 60 * 24));
    if (daysDiff > 30) {
      errors.warning = `Warning: Starting date is ${daysDiff} days from hire date`;
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateSalarySetup = (salaryData, previousRate = null) => {
  const errors = {};
  
  if (!salaryData.rate || salaryData.rate <= 0) {
    errors.rate = 'Please enter a valid hourly rate';
  } else {
    const rate = parseFloat(salaryData.rate);
    
    if (isNaN(rate) || rate <= 0) {
      errors.rate = 'Rate must be a positive number';
    } else if (rate > 10000) {
      errors.rate = 'Rate cannot exceed ₱10,000 per hour';
    }
    
    // Warning for significant changes
    if (previousRate && previousRate > 0) {
      const changePercent = ((rate - previousRate) / previousRate) * 100;
      if (Math.abs(changePercent) > 20) {
        errors.warning = `Significant rate change: ${changePercent > 0 ? 'Increase' : 'Decrease'} of ${Math.abs(changePercent).toFixed(1)}%`;
      }
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateBenefitsEnrollment = (benefitsData) => {
  const errors = {};
  
  // Member ID validation based on benefit type
  if (!benefitsData.memberId) {
    errors.memberId = 'Member ID is required';
  } else {
    switch (benefitsData.benefitType) {
      case 'sss':
        const sssRegex = /^\d{2}-\d{7}-\d{1}$/;
        if (!sssRegex.test(benefitsData.memberId)) {
          errors.memberId = 'SSS Member ID must be in format: XX-XXXXXXXX-X';
        }
        break;
      case 'philhealth':
        const philhealthRegex = /^\d{2}-\d{9}-\d{1}$/;
        if (!philhealthRegex.test(benefitsData.memberId)) {
          errors.memberId = 'PhilHealth Member ID must be in format: XX-XXXXXXXXX-X';
        }
        break;
      case 'pagibig':
        const pagibigRegex = /^\d{4}-\d{4}-\d{4}$/;
        if (!pagibigRegex.test(benefitsData.memberId)) {
          errors.memberId = 'Pag-IBIG Member ID must be in format: XXXX-XXXX-XXXX';
        }
        break;
    }
  }
  
  // Monthly contribution validation
  if (!benefitsData.contribution || benefitsData.contribution <= 0) {
    errors.contribution = 'Monthly contribution must be a positive number';
  }
  
  // Enrollment date validation
  if (benefitsData.enrollmentDate) {
    const enrollmentDate = new Date(benefitsData.enrollmentDate);
    const today = new Date();
    if (enrollmentDate > today) {
      errors.enrollmentDate = 'Enrollment date cannot be in the future';
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Utility function to format file size
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Utility function to validate required fields
export const validateRequiredFields = (data, requiredFields) => {
  const errors = {};
  
  requiredFields.forEach(field => {
    if (!data[field] || (typeof data[field] === 'string' && data[field].trim().length === 0)) {
      errors[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
    }
  });
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Utility function to show validation errors
export const showValidationErrors = (errors) => {
  const errorMessages = Object.values(errors).filter(msg => !msg.includes('Warning:'));
  const warnings = Object.values(errors).filter(msg => msg.includes('Warning:'));
  
  return {
    errors: errorMessages,
    warnings: warnings
  };
};

