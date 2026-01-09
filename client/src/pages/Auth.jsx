import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store';
import { Truck, Mail, Lock, User, Phone, ArrowRight, Eye, EyeOff } from 'lucide-react';
import './Auth.css';

export function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { login, isLoading, error, clearError } = useAuthStore();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        clearError();
        const result = await login(email, password);
        if (result.success) {
            navigate('/dashboard');
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-left">
                    <div className="auth-brand">
                        <Link to="/" className="logo">
                            <div className="logo-icon">
                                <Truck size={28} />
                            </div>
                            <span className="logo-text">ChainFreight</span>
                        </Link>
                    </div>
                    <div className="auth-hero">
                        <h1>Welcome Back</h1>
                        <p>Sign in to manage your shipments and connect with transporters</p>
                    </div>
                    <div className="auth-visual">
                        <div className="visual-card glass">
                            <div className="visual-icon">🚚</div>
                            <p>Track shipments in real-time</p>
                        </div>
                        <div className="visual-card glass">
                            <div className="visual-icon">📊</div>
                            <p>Analytics & insights</p>
                        </div>
                        <div className="visual-card glass">
                            <div className="visual-icon">💰</div>
                            <p>Transparent pricing</p>
                        </div>
                    </div>
                </div>

                <div className="auth-right">
                    <div className="auth-form-container">
                        <div className="auth-form-header">
                            <h2>Sign In</h2>
                            <p>Enter your credentials to access your account</p>
                        </div>

                        {error && (
                            <div className="auth-error">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="auth-form">
                            <div className="input-group">
                                <label htmlFor="email">Email Address</label>
                                <div className="input-with-icon">
                                    <Mail size={18} />
                                    <input
                                        type="email"
                                        id="email"
                                        className="input"
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="input-group">
                                <label htmlFor="password">Password</label>
                                <div className="input-with-icon">
                                    <Lock size={18} />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        id="password"
                                        className="input"
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="password-toggle"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className="auth-options">
                                <label className="checkbox-label">
                                    <input type="checkbox" />
                                    <span>Remember me</span>
                                </label>
                                <a href="#" className="forgot-link">Forgot password?</a>
                            </div>

                            <button type="submit" className="btn btn-primary btn-lg" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <span className="spinner" style={{ width: 20, height: 20 }}></span>
                                        Signing in...
                                    </>
                                ) : (
                                    <>
                                        Sign In
                                        <ArrowRight size={20} />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="auth-divider">
                            <span>or</span>
                        </div>

                        <div className="auth-footer">
                            <p>Don't have an account? <Link to="/register">Create one</Link></p>
                        </div>

                        <div className="demo-credentials">
                            <p><strong>Demo Credentials:</strong></p>
                            <p>Transporter: transporter@test.com / password123</p>
                            <p>Shipper: shipper@test.com / password123</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function Register() {
    const [searchParams] = useSearchParams();
    const defaultRole = searchParams.get('role') || 'shipper';

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
        role: defaultRole
    });
    const [showPassword, setShowPassword] = useState(false);
    const [validationErrors, setValidationErrors] = useState({});
    const { register, isLoading, error, clearError } = useAuthStore();
    const navigate = useNavigate();

    // Validation helpers
    const validateEmail = (email) => {
        // RFC 5322 compliant email regex - prevents emails starting with special chars
        const emailRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9._%+-]*[a-zA-Z0-9])?@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/;
        return emailRegex.test(email);
    };

    const validatePhone = (phone) => {
        // Remove all non-digit characters and check for minimum 10 digits
        const digitsOnly = phone.replace(/\D/g, '');
        return digitsOnly.length >= 10;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });

        // Real-time validation
        const errors = { ...validationErrors };
        
        if (name === 'email') {
            if (value && !validateEmail(value)) {
                errors.email = 'Please enter a valid email address';
            } else {
                delete errors.email;
            }
        }
        
        if (name === 'phone') {
            if (value && !validatePhone(value)) {
                errors.phone = 'Phone number must have at least 10 digits';
            } else {
                delete errors.phone;
            }
        }
        
        setValidationErrors(errors);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        clearError();

        // Final validation before submit
        const errors = {};
        
        if (!validateEmail(formData.email)) {
            errors.email = 'Please enter a valid email address';
        }
        
        if (formData.phone && !validatePhone(formData.phone)) {
            errors.phone = 'Phone number must have at least 10 digits';
        }
        
        if (formData.password !== formData.confirmPassword) {
            errors.confirmPassword = 'Passwords do not match';
        }
        
        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            return;
        }

        const result = await register({
            name: formData.name,
            email: formData.email,
            password: formData.password,
            phone: formData.phone,
            role: formData.role
        });

        if (result.success) {
            navigate('/dashboard');
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-left">
                    <div className="auth-brand">
                        <Link to="/" className="logo">
                            <div className="logo-icon">
                                <Truck size={28} />
                            </div>
                            <span className="logo-text">ChainFreight</span>
                        </Link>
                    </div>
                    <div className="auth-hero">
                        <h1>Join ChainFreight</h1>
                        <p>Create an account to start shipping or become a transporter</p>
                    </div>
                    <div className="auth-visual">
                        <div className="visual-card glass">
                            <div className="visual-icon">🎯</div>
                            <p>Smart matching algorithms</p>
                        </div>
                        <div className="visual-card glass">
                            <div className="visual-icon">🛡️</div>
                            <p>Verified transporters</p>
                        </div>
                        <div className="visual-card glass">
                            <div className="visual-icon">📱</div>
                            <p>Real-time notifications</p>
                        </div>
                    </div>
                </div>

                <div className="auth-right">
                    <div className="auth-form-container">
                        <div className="auth-form-header">
                            <h2>Create Account</h2>
                            <p>Fill in your details to get started</p>
                        </div>

                        {error && (
                            <div className="auth-error">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="auth-form">
                            {/* Role Selection */}
                            <div className="role-selector">
                                <button
                                    type="button"
                                    className={`role-option ${formData.role === 'shipper' ? 'active' : ''}`}
                                    onClick={() => setFormData({ ...formData, role: 'shipper' })}
                                >
                                    <span className="role-icon">📦</span>
                                    <span className="role-label">Shipper</span>
                                    <span className="role-desc">I need to ship goods</span>
                                </button>
                                <button
                                    type="button"
                                    className={`role-option ${formData.role === 'transporter' ? 'active' : ''}`}
                                    onClick={() => setFormData({ ...formData, role: 'transporter' })}
                                >
                                    <span className="role-icon">🚛</span>
                                    <span className="role-label">Transporter</span>
                                    <span className="role-desc">I transport goods</span>
                                </button>
                            </div>

                            <div className="input-group">
                                <label htmlFor="name">Full Name</label>
                                <div className="input-with-icon">
                                    <User size={18} />
                                    <input
                                        type="text"
                                        id="name"
                                        name="name"
                                        className="input"
                                        placeholder="John Doe"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="input-group">
                                <label htmlFor="email">Email Address</label>
                                <div className="input-with-icon">
                                    <Mail size={18} />
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        className="input"
                                        placeholder="you@example.com"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        pattern="^[a-zA-Z0-9](?:[a-zA-Z0-9._%+-]*[a-zA-Z0-9])?@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}$"
                                        title="Please enter a valid email address (cannot start with special characters)"
                                    />
                                </div>
                                {validationErrors.email && <p className="error-text">{validationErrors.email}</p>}
                            </div>

                            <div className="input-group">
                                <label htmlFor="phone">Phone Number</label>
                                <div className="input-with-icon">
                                    <Phone size={18} />
                                    <input
                                        type="tel"
                                        id="phone"
                                        name="phone"
                                        className="input"
                                        placeholder="+91 98765 43210"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        minLength={10}
                                        pattern=".*[0-9].*[0-9].*[0-9].*[0-9].*[0-9].*[0-9].*[0-9].*[0-9].*[0-9].*[0-9].*"
                                        title="Phone number must contain at least 10 digits"
                                    />
                                </div>
                                {validationErrors.phone && <p className="error-text">{validationErrors.phone}</p>}
                            </div>

                            <div className="input-row">
                                <div className="input-group">
                                    <label htmlFor="password">Password</label>
                                    <div className="input-with-icon">
                                        <Lock size={18} />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            id="password"
                                            name="password"
                                            className="input"
                                            placeholder="••••••••"
                                            value={formData.password}
                                            onChange={handleChange}
                                            required
                                            minLength={6}
                                        />
                                    </div>
                                </div>
                                <div className="input-group">
                                    <label htmlFor="confirmPassword">Confirm</label>
                                    <div className="input-with-icon">
                                        <Lock size={18} />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            id="confirmPassword"
                                            name="confirmPassword"
                                            className="input"
                                            placeholder="••••••••"
                                            value={formData.confirmPassword}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {formData.password !== formData.confirmPassword && formData.confirmPassword && (
                                <p className="error-text">Passwords do not match</p>
                            )}

                            <div className="auth-options">
                                <label className="checkbox-label">
                                    <input type="checkbox" required />
                                    <span>I agree to the Terms of Service and Privacy Policy</span>
                                </label>
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary btn-lg"
                                disabled={isLoading || formData.password !== formData.confirmPassword}
                            >
                                {isLoading ? (
                                    <>
                                        <span className="spinner" style={{ width: 20, height: 20 }}></span>
                                        Creating account...
                                    </>
                                ) : (
                                    <>
                                        Create Account
                                        <ArrowRight size={20} />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="auth-footer">
                            <p>Already have an account? <Link to="/login">Sign in</Link></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
