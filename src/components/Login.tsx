import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { formatCPF, displayCPF, validateCPF } from '../utils/cpfUtils';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [cpf, setCPF] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cpfError, setCpfError] = useState('');
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
        await register(cpf, password);
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
    <div className="login-container">
      {import.meta.env.DEV && (
        <div style={{ 
          position: 'fixed', 
          top: 10, 
          right: 10, 
          background: '#667eea', 
          color: 'white', 
          padding: '8px 12px', 
          borderRadius: '6px',
          fontSize: '12px',
          zIndex: 1000
        }}>
          <Link to="/firebase-status" style={{ color: 'white', textDecoration: 'none' }}>
            🔍 Check Firebase Status
          </Link>
        </div>
      )}
      <div className="login-card">
        <h1 className="login-title">Teachers Timetable</h1>
        <h2 className="login-subtitle">
          {isLogin ? 'Login' : 'Cadastro'}
        </h2>

        {error && <div className="error-message">{error}</div>}
        {successMessage && <div className="success-message">{successMessage}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="cpf">CPF</label>
            <input
              id="cpf"
              type="text"
              value={displayCPF(cpf)}
              onChange={handleCPFChange}
              required
              placeholder="000.000.000-00"
              maxLength={14}
              className={cpfError ? 'input-error' : ''}
            />
            <small className="form-hint">Digite apenas os números do CPF</small>
            {cpfError && <div className="field-error">{cpfError}</div>}
            {!isLogin && cpf.length === 11 && !cpfError && (
              <div className="field-success">CPF válido</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Digite sua senha"
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading || (!isLogin && cpf.length === 11 && !!cpfError)}
            className="submit-button"
          >
            {loading ? 'Carregando...' : isLogin ? 'Entrar' : 'Cadastrar'}
          </button>
        </form>

        <div className="toggle-form">
          <p>
            {isLogin ? 'Não tem uma conta? ' : 'Já tem uma conta? '}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setCpfError('');
                setCPF('');
                setPassword('');
              }}
              className="toggle-button"
            >
              {isLogin ? 'Cadastrar' : 'Entrar'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
