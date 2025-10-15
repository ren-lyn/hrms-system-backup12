import { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';

const useUserProfile = () => {
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Define fetchUserProfile outside of useEffect to make it accessible to refreshProfile
  const fetchUserProfile = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Try to get user info from auth endpoint first with caching
      const { data: user, fromCache } = await apiService.getUserProfile({ forceRefresh });

      if (user) {
        
        // Prioritize position information from most specific to least specific
        let displayPosition = 'Employee';
        if (user.employeeProfile?.position) {
          displayPosition = user.employeeProfile.position;
        } else if (user.employeeProfile?.job_title) {
          displayPosition = user.employeeProfile.job_title;
        } else if (user.role?.name) {
          displayPosition = user.role.name;
        }
        
        setUserProfile({
          id: user.id,
          name: user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User',
          firstName: user.first_name || '',
          lastName: user.last_name || '',
          email: user.email || '',
          role: displayPosition, // Use the prioritized position as the role display
          department: user.employeeProfile?.department || '',
          position: displayPosition,
          rawRole: user.role?.name || 'Employee' // Keep the actual role for reference
        });
      } else {
        // Fallback to employee profile endpoint
        const { data: profileData } = await apiService.getEmployeeProfile({ forceRefresh });
        const profile = profileData.profile || profileData;
        
        // Prioritize position information from employee profile
        let displayPosition = 'Employee';
        if (profile.position) {
          displayPosition = profile.position;
        } else if (profile.job_title) {
          displayPosition = profile.job_title;
        } else if (profile.role) {
          displayPosition = profile.role;
        }
        
        setUserProfile({
          id: profile.id || profile.user_id,
          name: profile.name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'User',
          firstName: profile.first_name || '',
          lastName: profile.last_name || '',
          email: profile.email || '',
          role: displayPosition, // Use the prioritized position as the role display
          department: profile.department || '',
          position: displayPosition,
          rawRole: profile.role || 'Employee' // Keep the actual role for reference
        });
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setError(err.message || 'Failed to load user profile');
      
        // Fallback to localStorage if available
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          
          // Prioritize position information from stored user data
          let displayPosition = 'Employee';
          if (user.position) {
            displayPosition = user.position;
          } else if (user.job_title) {
            displayPosition = user.job_title;
            } else if (user.role) {
              // Ensure role is rendered as a string even if it's an object
              displayPosition = typeof user.role === 'string' ? user.role : (user.role?.name || 'Employee');
          }
          
          setUserProfile({
            id: user.id,
            name: user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User',
            firstName: user.first_name || '',
            lastName: user.last_name || '',
            email: user.email || '',
              role: displayPosition, // Use the prioritized position as the role display
            department: user.department || '',
            position: displayPosition,
              rawRole: (typeof user.role === 'string' ? user.role : (user.role?.name || 'Employee')) // Keep the actual role for reference
          });
        }
      } catch (storageError) {
        console.error('Error parsing stored user data:', storageError);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  // Function to refresh user profile
  const refreshProfile = async () => {
    await fetchUserProfile(true); // Force refresh
  };

  return {
    userProfile,
    loading,
    error,
    refreshProfile
  };
};

export default useUserProfile;