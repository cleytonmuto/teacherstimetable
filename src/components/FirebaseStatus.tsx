import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { testFirebaseConnection, validateFirebaseConfig, ConnectionStatus } from '../utils/firebaseConnection';
import './FirebaseStatus.css';

export default function FirebaseStatus() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [configValid, setConfigValid] = useState({ valid: true, missing: [] as string[] });

  useEffect(() => {
    const checkConnection = async () => {
      setLoading(true);
      
      // First validate configuration
      const config = validateFirebaseConfig();
      setConfigValid(config);
      
      if (!config.valid) {
        setStatus({
          connected: false,
          auth: false,
          firestore: false,
          error: `Missing environment variables: ${config.missing.join(', ')}`,
        });
        setLoading(false);
        return;
      }
      
      // Then test connection
      const connectionStatus = await testFirebaseConnection();
      setStatus(connectionStatus);
      setLoading(false);
    };

    checkConnection();
  }, []);

  if (loading) {
    return (
      <div className="firebase-status">
        <div className="status-loading">Checking Firebase connection...</div>
      </div>
    );
  }

  if (!status) {
    return null;
  }

  return (
    <div className="firebase-status">
      <div className="status-header">
        <h3>Firebase Connection Status</h3>
        <Link to="/login" className="back-button">← Back to Login</Link>
      </div>
      
      {!configValid.valid && (
        <div className="status-error">
          <strong>⚠️ Configuration Error</strong>
          <p>Missing environment variables: {configValid.missing.join(', ')}</p>
          <p>Please create a <code>.env</code> file with your Firebase credentials.</p>
        </div>
      )}

      <div className="status-grid">
        <div className={`status-item ${status.connected ? 'success' : 'error'}`}>
          <div className="status-label">Overall Status</div>
          <div className="status-value">
            {status.connected ? '✅ Connected' : '❌ Not Connected'}
          </div>
        </div>

        <div className={`status-item ${status.auth ? 'success' : 'error'}`}>
          <div className="status-label">Authentication</div>
          <div className="status-value">
            {status.auth ? '✅ Connected' : '❌ Not Connected'}
          </div>
        </div>

        <div className={`status-item ${status.firestore ? 'success' : 'error'}`}>
          <div className="status-label">Firestore</div>
          <div className="status-value">
            {status.firestore ? '✅ Connected' : '❌ Not Connected'}
          </div>
        </div>
      </div>

      {status.error && (
        <div className="status-error">
          <strong>Error:</strong> {status.error}
          {status.firestoreErrorCode && (
            <div style={{ marginTop: '10px', fontSize: '12px' }}>
              <strong>Error Code:</strong> {status.firestoreErrorCode}
            </div>
          )}
          {status.firestoreErrorCode === 'permission-denied' && (
            <div style={{ marginTop: '10px', padding: '10px', background: '#fff3cd', borderRadius: '4px' }}>
              <strong>💡 Solution:</strong> Update your Firestore security rules to allow test operations:
              <pre style={{ marginTop: '8px', fontSize: '11px', overflow: 'auto' }}>
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow connection test
    match /_connection_test/{document=**} {
      allow read, write: if true;
    }
    // Your other rules...
  }
}`}
              </pre>
            </div>
          )}
          {(status.firestoreErrorCode === 'unavailable' || status.firestoreErrorCode === 'failed-precondition') && (
            <div style={{ marginTop: '10px', padding: '10px', background: '#fff3cd', borderRadius: '4px' }}>
              <strong>💡 Solution:</strong> 
              <ol style={{ marginLeft: '20px', marginTop: '8px' }}>
                <li>Go to <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer">Firebase Console</a></li>
                <li>Select your project: <strong>fir-react-5d6b7</strong></li>
                <li>Go to Firestore Database</li>
                <li>Click "Create database" if it doesn't exist</li>
                <li>Choose "Start in test mode" for development</li>
              </ol>
            </div>
          )}
        </div>
      )}

      {status.connected && (
        <div className="status-success">
          <strong>✅ All Firebase services are connected and working correctly!</strong>
        </div>
      )}
    </div>
  );
}
