import React, { useState, useEffect, useRef } from 'react';
import { Alert, Button, Spinner } from 'react-bootstrap';
import { FileText, Download, RefreshCw, AlertTriangle } from 'lucide-react';
import { 
  getSignatureFallbackUrls, 
  isImageFile, 
  isBase64Data, 
  downloadSignatureFile,
  isOnline
} from '../../utils/signatureUtils';

const SignatureDisplay = ({ 
  signaturePath, 
  base64Data = null, 
  employeeName, 
  leaveType,
  style = {},
  showDownload = true,
  showRefresh = true,
  maxWidth = '100%',
  maxHeight = '400px',
  className = ''
}) => {
  const [loadingState, setLoadingState] = useState('loading'); // loading, success, error
  const [currentUrl, setCurrentUrl] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [urlIndex, setUrlIndex] = useState(0);
  const [isNetworkOnline, setIsNetworkOnline] = useState(navigator.onLine);
  const imgRef = useRef(null);

  const fallbackUrls = signaturePath ? getSignatureFallbackUrls(signaturePath) : [];
  const isImage = signaturePath ? isImageFile(signaturePath) : true;
  const hasBase64 = base64Data && isBase64Data(base64Data);

  useEffect(() => {
    // Listen for network changes
    const handleOnline = () => setIsNetworkOnline(true);
    const handleOffline = () => setIsNetworkOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    loadSignature();
  }, [signaturePath, base64Data, urlIndex]);

  const loadSignature = async () => {
    if (!signaturePath && !hasBase64) {
      setLoadingState('error');
      setErrorMessage('No signature data available');
      return;
    }

    setLoadingState('loading');

    // If we have base64 data and we're offline, use it
    if (hasBase64 && (!isNetworkOnline || !signaturePath)) {
      setCurrentUrl(base64Data);
      setLoadingState('success');
      return;
    }

    // If we have a signature path, try to load it
    if (signaturePath && fallbackUrls.length > 0 && isNetworkOnline) {
      if (urlIndex < fallbackUrls.length) {
        const url = fallbackUrls[urlIndex];
        setCurrentUrl(url);
        // Loading state will be updated by image onLoad/onError handlers
      } else {
        // All URLs failed, fall back to base64 if available
        if (hasBase64) {
          setCurrentUrl(base64Data);
          setLoadingState('success');
        } else {
          setLoadingState('error');
          setErrorMessage('Unable to load signature from any source');
        }
      }
    } else if (!isNetworkOnline) {
      if (hasBase64) {
        setCurrentUrl(base64Data);
        setLoadingState('success');
      } else {
        setLoadingState('error');
        setErrorMessage('No internet connection and no offline data available');
      }
    } else {
      setLoadingState('error');
      setErrorMessage('No signature sources available');
    }
  };

  const handleImageLoad = () => {
    setLoadingState('success');
    setErrorMessage('');
  };

  const handleImageError = (event) => {
    const failedUrl = event?.target?.src || currentUrl;
    console.error(`❌ Image failed to load from URL ${urlIndex + 1}/${fallbackUrls.length}:`, failedUrl);
    console.log('Image error event:', event);
    
    // Check if it's a network error
    fetch(failedUrl, { method: 'HEAD' })
      .then(response => {
        console.log(`HTTP response for ${failedUrl}:`, response.status, response.statusText);
        if (!response.ok) {
          console.error(`HTTP ${response.status}: ${response.statusText}`);
        }
      })
      .catch(fetchError => {
        console.error(`Network error for ${failedUrl}:`, fetchError);
      });
    
    // Try next URL
    if (urlIndex < fallbackUrls.length - 1) {
      console.log(`⏭️ Trying next URL (${urlIndex + 2}/${fallbackUrls.length}): ${fallbackUrls[urlIndex + 1]}`);
      setUrlIndex(prev => prev + 1);
    } else {
      // All URLs failed, try base64 fallback
      if (hasBase64) {
        console.log('💾 All URLs failed, falling back to base64 data');
        setCurrentUrl(base64Data);
        setLoadingState('success');
      } else {
        console.error('🚫 All signature loading methods failed');
        setLoadingState('error');
        setErrorMessage('Unable to load signature image from any source');
      }
    }
  };

  const handleRefresh = () => {
    setUrlIndex(0);
    setLoadingState('loading');
    loadSignature();
  };

  const handleDownload = async () => {
    try {
      if (signaturePath) {
        const filename = `signature_${employeeName}_${leaveType}.${signaturePath.split('.').pop()}`;
        await downloadSignatureFile(signaturePath, filename);
      } else if (hasBase64) {
        // Download base64 data
        const link = document.createElement('a');
        link.href = base64Data;
        link.download = `signature_${employeeName}_${leaveType}.png`;
        link.click();
      }
    } catch (error) {
      console.error('Download failed:', error);
      // You might want to show a toast or alert here
    }
  };

  const renderSignatureContent = () => {
    if (loadingState === 'loading') {
      return (
        <div className="text-center py-4">
          <Spinner animation="border" variant="primary" size="sm" className="me-2" />
          <span>Loading signature...</span>
        </div>
      );
    }

    if (loadingState === 'error') {
      return (
        <Alert variant="warning" className="text-center">
          <AlertTriangle size={24} className="mb-2" />
          <div>
            <strong>Unable to load signature</strong>
            <p className="mb-2">{errorMessage}</p>
            {showRefresh && (
              <Button variant="outline-warning" size="sm" onClick={handleRefresh}>
                <RefreshCw size={16} className="me-1" />
                Try Again
              </Button>
            )}
          </div>
        </Alert>
      );
    }

    if (loadingState === 'success' && currentUrl) {
      if (isImage) {
        return (
          <div className="text-center">
            <img
              ref={imgRef}
              src={currentUrl}
              alt="E-Signature"
              style={{
                maxWidth,
                maxHeight,
                border: '1px solid #ddd',
                borderRadius: '8px',
                ...style
              }}
              className={className}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
            {/* Network status indicator */}
            {!isNetworkOnline && hasBase64 && (
              <div className="mt-2">
                <small className="text-muted">
                  📱 Viewing offline copy
                </small>
              </div>
            )}
          </div>
        );
      } else {
        // PDF or other file types
        return (
          <Alert variant="info" className="text-center">
            <FileText size={48} className="mb-3" />
            <h6>PDF Signature</h6>
            <p>This signature is in PDF format. Click below to view or download.</p>
            <div className="d-flex gap-2 justify-content-center">
              <Button
                variant="primary"
                href={currentUrl}
                target="_blank"
                rel="noopener noreferrer"
                size="sm"
              >
                View PDF
              </Button>
              {showDownload && (
                <Button
                  variant="outline-primary"
                  onClick={handleDownload}
                  size="sm"
                >
                  <Download size={16} className="me-1" />
                  Download
                </Button>
              )}
            </div>
          </Alert>
        );
      }
    }

    return null;
  };

  return (
    <div className="signature-display">
      {employeeName && (
        <div className="mb-2">
          <small className="text-muted">
            <strong>Employee:</strong> {employeeName}
            {leaveType && <> • <strong>Leave:</strong> {leaveType}</>}
          </small>
        </div>
      )}
      
      {renderSignatureContent()}
      
      {loadingState === 'success' && isImage && showDownload && (
        <div className="text-center mt-2">
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={handleDownload}
          >
            <Download size={14} className="me-1" />
            Download
          </Button>
          {showRefresh && (
            <Button
              variant="outline-secondary"
              size="sm"
              className="ms-2"
              onClick={handleRefresh}
            >
              <RefreshCw size={14} className="me-1" />
              Refresh
            </Button>
          )}
        </div>
      )}
      
      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-2">
          <summary className="text-muted" style={{ cursor: 'pointer' }}>
            <small>Debug Info</small>
          </summary>
          <div className="mt-2 small text-muted">
            <div><strong>State:</strong> {loadingState}</div>
            <div><strong>URL Index:</strong> {urlIndex + 1}/{fallbackUrls.length}</div>
            <div><strong>Current URL:</strong> {currentUrl ? currentUrl.substring(0, 50) + '...' : 'None'}</div>
            <div><strong>Has Base64:</strong> {hasBase64 ? 'Yes' : 'No'}</div>
            <div><strong>Online:</strong> {isNetworkOnline ? 'Yes' : 'No'}</div>
            <div><strong>Is Image:</strong> {isImage ? 'Yes' : 'No'}</div>
          </div>
        </details>
      )}
    </div>
  );
};

export default SignatureDisplay;
