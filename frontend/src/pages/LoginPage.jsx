import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

// Screens: 'login' | 'register' | 'otp' | 'loading' | 'registered'
export default function LoginPage() {
  const { login, verifyOtp, finalizeLogin, register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { document.title = 'WhatsApp'; }, []);

  const [screen, setScreen]     = useState('login');
  const [form, setForm]         = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [otpEmail, setOtpEmail] = useState('');
  const [otp, setOtp]           = useState(['', '', '', '', '', '']);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [progress, setProgress] = useState(0);
  const otpRefs                 = useRef([]);
  const pendingAuth             = useRef(null); // holds { token, user } until loading completes

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // ── Register ──
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await register(form.username, form.email, form.password);
      setScreen('registered');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  // ── Login step 1: credentials ──
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(form.email, form.password);
      if (res.requiresOtp) {
        setOtpEmail(res.email);
        setScreen('otp');
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Cannot connect to server.');
    } finally {
      setLoading(false);
    }
  };

  // ── OTP input ──
  const handleOtpChange = (i, val) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[i] = val.slice(-1);
    setOtp(next);
    if (val && i < 5) otpRefs.current[i + 1]?.focus();
    if (next.every((d) => d !== '') && next.join('').length === 6) {
      submitOtp(next.join(''));
    }
  };

  const handleOtpKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  };

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const next = pasted.split('');
      setOtp(next);
      otpRefs.current[5]?.focus();
      submitOtp(pasted);
    }
  };

  // ── Login step 2: verify OTP ──
  const submitOtp = async (code) => {
    setError('');
    setLoading(true);
    try {
      const data = await verifyOtp(otpEmail, code);
      pendingAuth.current = data; // store token+user for after loading
      startLoading();
    } catch (err) {
      setError(err.response?.data?.message || 'Incorrect OTP. Please try again.');
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
    } finally {
      setLoading(false);
    }
  };

  // ── Loading progress bar ──
  const startLoading = () => {
    setScreen('loading');
    setProgress(0);
    let p = 0;
    const tick = setInterval(() => {
      p += p < 60 ? 5 : p < 80 ? 2 : p < 90 ? 0.8 : 0.2;
      setProgress(Math.min(p, 90));
      if (p >= 90) {
        clearInterval(tick);
        setTimeout(() => {
          setProgress(100);
          // Now actually log in — sets token+user, App.jsx will redirect
          if (pendingAuth.current) {
            finalizeLogin(pendingAuth.current);
            pendingAuth.current = null;
          }
          setTimeout(() => navigate('/'), 350);
        }, 700);
      }
    }, 55);
  };

  // ════════════════════════════════════════
  // LOADING SCREEN
  // ════════════════════════════════════════
  if (screen === 'loading') {
    return (
      <div className="wa-loading-screen">
        {/* Green header */}
        <div className="wa-loading-header">
          <span className="wa-loading-header-title">WhatsApp</span>
        </div>

        {/* Center content */}
        <div className="wa-loading-content">
          {/* Phone illustration */}
          <div className="wa-loading-illustration">
            {/* Teal circle background */}
            <div className="wa-loading-circle">
              {/* Cloud shapes */}
              <div className="wa-cloud wa-cloud-1" />
              <div className="wa-cloud wa-cloud-2" />
            </div>
            {/* Phone */}
            <div className="wa-loading-phone">
              <div className="wa-loading-phone-screen">
                <svg viewBox="0 0 24 24" width="32" height="32">
                  <path fill="#fff" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
            </div>
            {/* Spinning arc */}
            <div className="wa-loading-spinner" />
          </div>

          <h2 className="wa-loading-title">Loading your chats</h2>
          <p className="wa-loading-encrypted">
            <svg viewBox="0 0 24 24" width="14" height="14" style={{marginRight:5,flexShrink:0}}>
              <path fill="#00a884" d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
            </svg>
            End-to-end encrypted
          </p>

          {/* Progress bar */}
          <div className="wa-loading-bar-track">
            <div className="wa-loading-bar-fill" style={{ width: `${progress}%` }} />
          </div>

          <p className="wa-loading-subtitle">This may take a few minutes</p>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════
  // OTP SCREEN
  // ════════════════════════════════════════
  if (screen === 'otp') {
    return (
      <div className="login-container">
        <div className="login-box">
          <div className="login-logo"><WaLogo size={36} /><h1>WhatsApp</h1></div>
          <h2>Verify your email</h2>
          <p className="otp-subtitle">
            We sent a 6-digit code to<br />
            <strong>{otpEmail}</strong>
          </p>
          {error && <p className="login-error">{error}</p>}
          <div className="otp-inputs" onPaste={handleOtpPaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => (otpRefs.current[i] = el)}
                className="otp-input"
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(i, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(i, e)}
                autoComplete="one-time-code"
              />
            ))}
          </div>
          <button
            className="otp-verify-btn"
            onClick={() => submitOtp(otp.join(''))}
            disabled={loading || otp.some((d) => !d)}
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>
          <p className="login-toggle">
            Wrong email?{' '}
            <span onClick={() => { setScreen('login'); setOtp(['','','','','','']); setError(''); }}>
              Go back
            </span>
          </p>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════
  // REGISTERED SUCCESS SCREEN
  // ════════════════════════════════════════
  if (screen === 'registered') {
    return (
      <div className="login-container">
        <div className="login-box">
          <div className="login-logo"><WaLogo size={36} /><h1>WhatsApp</h1></div>
          <div className="registered-icon">
            <svg viewBox="0 0 24 24" width="52" height="52">
              <circle cx="12" cy="12" r="11" fill="none" stroke="#00a884" strokeWidth="1.8"/>
              <path d="M7 12.5l3.5 3.5 6.5-7" stroke="#00a884" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
          </div>
          <h2>Account created!</h2>
          <p className="otp-subtitle">
            Your account has been created successfully.<br />
            Please sign in to continue.
          </p>
          <button
            className="otp-verify-btn"
            onClick={() => { setScreen('login'); setForm({ username:'', email:'', password:'', confirmPassword:'' }); }}
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════
  // REGISTER FORM
  // ════════════════════════════════════════
  if (screen === 'register') {
    return (
      <div className="login-container">
        <div className="login-box">
          <div className="login-logo"><WaLogo size={36} /><h1>WhatsApp</h1></div>
          <h2>Create Account</h2>
          {error && <p className="login-error">{error}</p>}
          <form onSubmit={handleRegister} className="login-form">
            <input
              name="username"
              placeholder="Username"
              value={form.username}
              onChange={handleChange}
              required
              autoFocus
            />
            <input
              name="email"
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              required
            />
            <input
              name="password"
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              required
              minLength={6}
            />
            <input
              name="confirmPassword"
              type="password"
              placeholder="Confirm Password"
              value={form.confirmPassword}
              onChange={handleChange}
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Creating account...' : 'Register'}
            </button>
          </form>
          <p className="login-toggle">
            Already have an account?{' '}
            <span onClick={() => { setScreen('login'); setError(''); }}>Sign In</span>
          </p>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════
  // LOGIN FORM (default)
  // ════════════════════════════════════════
  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-logo"><WaLogo size={36} /><h1>WhatsApp</h1></div>
        <h2>Sign In</h2>
        {error && <p className="login-error">{error}</p>}
        <form onSubmit={handleLogin} className="login-form">
          <input
            name="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
            autoFocus
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Please wait...' : 'Continue'}
          </button>
        </form>
        <p className="login-toggle">
          Don't have an account?{' '}
          <span onClick={() => { setScreen('register'); setError(''); }}>Register</span>
        </p>
      </div>
    </div>
  );
}

// Shared WhatsApp logo SVG
function WaLogo({ size = 36 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size}>
      <path fill="#00a884" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}
