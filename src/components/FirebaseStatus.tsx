import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { testFirebaseConnection, validateFirebaseConfig } from '../utils/firebaseConnection';
import type { ConnectionStatus } from '../utils/firebaseConnection';

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-lg text-gray-600 dark:text-gray-400">Verificando conexão Firebase...</div>
      </div>
    );
  }

  if (!status) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="container mx-auto max-w-4xl py-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Firebase Connection Status</h3>
            <Link
              to="/login"
              className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors"
            >
              ← Voltar ao Login
            </Link>
          </div>
          
          {!configValid.valid && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <strong className="block text-red-800 dark:text-red-300 mb-2">⚠️ Erro de Configuração</strong>
              <p className="text-red-700 dark:text-red-400 text-sm mb-2">
                Variáveis de ambiente ausentes: {configValid.missing.join(', ')}
              </p>
              <p className="text-red-700 dark:text-red-400 text-sm">
                Por favor, crie um arquivo <code className="bg-red-100 dark:bg-red-900/40 px-1 rounded">.env</code> com suas credenciais Firebase.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className={`p-4 rounded-lg border-2 ${
              status.connected
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}>
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Status Geral</div>
              <div className={`text-lg font-semibold ${
                status.connected
                  ? 'text-green-700 dark:text-green-400'
                  : 'text-red-700 dark:text-red-400'
              }`}>
                {status.connected ? '✅ Conectado' : '❌ Não Conectado'}
              </div>
            </div>

            <div className={`p-4 rounded-lg border-2 ${
              status.auth
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}>
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Autenticação</div>
              <div className={`text-lg font-semibold ${
                status.auth
                  ? 'text-green-700 dark:text-green-400'
                  : 'text-red-700 dark:text-red-400'
              }`}>
                {status.auth ? '✅ Conectado' : '❌ Não Conectado'}
              </div>
            </div>

            <div className={`p-4 rounded-lg border-2 ${
              status.firestore
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}>
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Firestore</div>
              <div className={`text-lg font-semibold ${
                status.firestore
                  ? 'text-green-700 dark:text-green-400'
                  : 'text-red-700 dark:text-red-400'
              }`}>
                {status.firestore ? '✅ Conectado' : '❌ Não Conectado'}
              </div>
            </div>
          </div>

          {status.error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <strong className="block text-red-800 dark:text-red-300 mb-2">Erro:</strong>
              <p className="text-red-700 dark:text-red-400 text-sm mb-3">{status.error}</p>
              {status.firestoreErrorCode && (
                <div className="text-sm text-red-700 dark:text-red-400 mb-3">
                  <strong>Código de Erro:</strong> {status.firestoreErrorCode}
                </div>
              )}
              {status.firestoreErrorCode === 'permission-denied' && (
                <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <strong className="block text-yellow-800 dark:text-yellow-300 mb-2">💡 Solução:</strong>
                  <p className="text-yellow-700 dark:text-yellow-400 text-sm mb-2">
                    Atualize suas regras de segurança do Firestore para permitir operações de teste:
                  </p>
                  <pre className="mt-2 p-3 bg-gray-100 dark:bg-gray-900 rounded text-xs overflow-auto text-gray-800 dark:text-gray-300">
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
                <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <strong className="block text-yellow-800 dark:text-yellow-300 mb-2">💡 Solução:</strong>
                  <ol className="list-decimal list-inside text-yellow-700 dark:text-yellow-400 text-sm space-y-1 ml-2">
                    <li>Vá para <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="underline">Firebase Console</a></li>
                    <li>Selecione seu projeto: <strong>fir-react-5d6b7</strong></li>
                    <li>Vá para Firestore Database</li>
                    <li>Clique em "Create database" se não existir</li>
                    <li>Escolha "Start in test mode" para desenvolvimento</li>
                  </ol>
                </div>
              )}
            </div>
          )}

          {status.connected && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <strong className="text-green-800 dark:text-green-300">
                ✅ Todos os serviços Firebase estão conectados e funcionando corretamente!
              </strong>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
