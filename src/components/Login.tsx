import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { displayCPF, validateCPF } from '../utils/cpfUtils';
import { validatePassword } from '../utils/passwordUtils';

export default function Login() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [cpf, setCPF] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [cpfError, setCpfError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const { login, register, currentUser } = useAuth();

  // Redirect to dashboard if user is already logged in
  useEffect(() => {
    if (currentUser) {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    // Remove all non-numeric characters
    value = value.replace(/\D/g, '');
    // Limit to 11 digits
    if (value.length <= 11) {
      setCPF(value);
      setCpfError('');
      setError('');
    }
  };

  // Validate CPF in real-time (only for registration)
  useEffect(() => {
    if (!isLogin && cpf.length === 11) {
      if (!validateCPF(cpf)) {
        setCpfError('CPF inválido. Verifique se o CPF está correto.');
      } else {
        setCpfError('');
      }
    } else if (cpf.length > 0 && cpf.length < 11) {
      setCpfError('');
    }
  }, [cpf, isLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(cpf, password);
        // Navigation will happen automatically via useEffect when currentUser changes
      } else {
        // Registration
        if (!name.trim()) {
          setError('Por favor, informe seu nome.');
          setLoading(false);
          return;
        }
        
        // Validate password
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
          setPasswordError(passwordValidation.errors.join('. '));
          setLoading(false);
          return;
        }
        
        await register(cpf, password, name.trim());
        setSuccessMessage('Cadastro realizado com sucesso! Redirecionando...');
        // Wait a bit to show success message, then navigate
        // The user should be automatically logged in via onAuthStateChanged
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      }
    } catch (err: any) {
      console.error('Authentication error:', err);
      setError(err.message || 'Ocorreu um erro');
      setSuccessMessage('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 via-primary-600 to-purple-600 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      {import.meta.env.DEV && (
        <Link
          to="/firebase-status"
          className="fixed top-4 right-4 bg-primary-500 hover:bg-primary-600 text-white px-3 py-2 rounded-lg text-xs font-medium shadow-lg transition-colors z-50"
        >
          🔍 Check Firebase Status
        </Link>
      )}
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 md:p-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Teachers Timetable
          </h1>
          <h2 className="text-xl text-gray-600 dark:text-gray-300 font-medium">
            {isLogin ? 'Login' : 'Cadastro'}
          </h2>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-lg text-sm">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="cpf" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              CPF
            </label>
            <input
              id="cpf"
              type="text"
              value={displayCPF(cpf)}
              onChange={handleCPFChange}
              required
              placeholder="000.000.000-00"
              maxLength={14}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 ${
                cpfError
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            <small className="block mt-1 text-xs text-gray-500 dark:text-gray-400">
              Digite apenas os números do CPF
            </small>
            {cpfError && (
              <div className="mt-1 text-xs text-red-600 dark:text-red-400">{cpfError}</div>
            )}
            {!isLogin && cpf.length === 11 && !cpfError && (
              <div className="mt-1 text-xs text-green-600 dark:text-green-400">CPF válido</div>
            )}
          </div>

          {!isLogin && (
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nome Completo *
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Digite seu nome completo"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
              />
            </div>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Senha {!isLogin && '*'}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordError('');
                setError('');
              }}
              required
              placeholder={isLogin ? "Digite sua senha" : "Mínimo 8 caracteres, 1 maiúscula, 1 minúscula, 1 número, 1 símbolo"}
              minLength={!isLogin ? 8 : 6}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 ${
                passwordError
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {!isLogin && (
              <small className="block mt-1 text-xs text-gray-500 dark:text-gray-400">
                A senha deve ter pelo menos 8 caracteres, incluindo 1 maiúscula, 1 minúscula, 1 número e 1 símbolo
              </small>
            )}
            {passwordError && (
              <div className="mt-1 text-xs text-red-600 dark:text-red-400">{passwordError}</div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || (!isLogin && ((cpf.length === 11 && !!cpfError) || !!passwordError))}
            className="w-full py-3 bg-gradient-to-r from-primary-500 to-purple-600 hover:from-primary-600 hover:to-purple-700 text-white font-semibold rounded-lg shadow-lg transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? 'Carregando...' : isLogin ? 'Entrar' : 'Cadastrar'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          {isLogin ? 'Não tem uma conta? ' : 'Já tem uma conta? '}
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
              setCpfError('');
              setPasswordError('');
              setCPF('');
              setPassword('');
              setName('');
            }}
            className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-semibold underline"
          >
            {isLogin ? 'Cadastrar' : 'Entrar'}
          </button>
        </div>
      </div>
    </div>
  );
}
