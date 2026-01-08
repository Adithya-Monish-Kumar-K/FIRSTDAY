import { Link } from 'react-router-dom';
import {
    Truck, Package, MapPin, Shield, Clock, DollarSign,
    ArrowRight, Star, Users, Route, Zap, CheckCircle
} from 'lucide-react';
import './Landing.css';

export default function Landing() {
    const features = [
        {
            icon: Route,
            title: 'Smart Route Optimization',
            description: 'Google OR-Tools powered VRP solver finds the most efficient delivery routes automatically.'
        },
        {
            icon: Package,
            title: 'Cargo-Vehicle Matching',
            description: 'Automatic filtering matches your cargo with the right vehicle type - refrigerated, covered, or open.'
        },
        {
            icon: MapPin,
            title: 'Real-time Tracking',
            description: 'Track shipments in real-time with checkpoint updates and instant notifications.'
        },
        {
            icon: Shield,
            title: 'Security Verified',
            description: 'Photo verification at each handoff ensures cargo integrity throughout the journey.'
        },
        {
            icon: Clock,
            title: 'Accurate ETAs',
            description: 'Dynamic ETA calculations based on real traffic, distance, and handoff times.'
        },
        {
            icon: DollarSign,
            title: 'Dynamic Pricing',
            description: 'Transparent fuel-based pricing that adapts to market rates and route efficiency.'
        }
    ];

    const stats = [
        { value: '50K+', label: 'Deliveries Completed' },
        { value: '10K+', label: 'Verified Transporters' },
        { value: '99.5%', label: 'On-time Delivery' },
        { value: '4.8★', label: 'Average Rating' }
    ];

    return (
        <div className="landing">
            {/* Hero Section */}
            <header className="landing-header glass-dark">
                <div className="container">
                    <div className="header-content">
                        <div className="logo">
                            <div className="logo-icon">
                                <Truck size={28} />
                            </div>
                            <span className="logo-text">LogiFlow</span>
                        </div>
                        <nav className="header-nav">
                            <a href="#features">Features</a>
                            <a href="#how-it-works">How it Works</a>
                            <a href="#pricing">Pricing</a>
                        </nav>
                        <div className="header-actions">
                            <Link to="/login" className="btn btn-ghost">Sign In</Link>
                            <Link to="/register" className="btn btn-primary">Get Started</Link>
                        </div>
                    </div>
                </div>
            </header>

            {/* Hero */}
            <section className="hero">
                <div className="hero-bg">
                    <div className="hero-glow hero-glow-1"></div>
                    <div className="hero-glow hero-glow-2"></div>
                </div>
                <div className="container">
                    <div className="hero-content animate-fadeIn">
                        <div className="hero-badge">
                            <Zap size={14} />
                            <span>AI-Powered Logistics Platform</span>
                        </div>
                        <h1>
                            The Future of<br />
                            <span className="gradient-text">Freight Transportation</span>
                        </h1>
                        <p className="hero-description">
                            Connect with verified transporters, optimize routes in real-time,
                            and track your cargo every step of the way. Reduce costs, minimize
                            empty miles, and deliver faster.
                        </p>
                        <div className="hero-actions">
                            <Link to="/register" className="btn btn-primary btn-lg">
                                Start Shipping Now
                                <ArrowRight size={20} />
                            </Link>
                            <Link to="/register?role=transporter" className="btn btn-outline btn-lg">
                                Join as Transporter
                            </Link>
                        </div>
                        <div className="hero-stats">
                            {stats.map((stat, index) => (
                                <div key={index} className="stat-item">
                                    <span className="stat-value">{stat.value}</span>
                                    <span className="stat-label">{stat.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section id="features" className="features">
                <div className="container">
                    <div className="section-header">
                        <span className="section-badge">Features</span>
                        <h2>Everything You Need for Modern Logistics</h2>
                        <p>Powerful tools to streamline your freight operations from pickup to delivery</p>
                    </div>
                    <div className="features-grid">
                        {features.map((feature, index) => (
                            <div key={index} className="feature-card card animate-slideUp" style={{ animationDelay: `${index * 100}ms` }}>
                                <div className="feature-icon">
                                    <feature.icon size={28} />
                                </div>
                                <h3>{feature.title}</h3>
                                <p>{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section id="how-it-works" className="how-it-works">
                <div className="container">
                    <div className="section-header">
                        <span className="section-badge">Process</span>
                        <h2>How LogiFlow Works</h2>
                        <p>Simple steps to get your cargo moving</p>
                    </div>
                    <div className="steps">
                        <div className="step">
                            <div className="step-number">1</div>
                            <div className="step-content">
                                <h3>Post Your Shipment</h3>
                                <p>Enter cargo details, pickup and delivery locations, and special requirements</p>
                            </div>
                        </div>
                        <div className="step-connector"></div>
                        <div className="step">
                            <div className="step-number">2</div>
                            <div className="step-content">
                                <h3>Get Matched</h3>
                                <p>Our AI matches you with the best transporters based on route, vehicle, and ratings</p>
                            </div>
                        </div>
                        <div className="step-connector"></div>
                        <div className="step">
                            <div className="step-number">3</div>
                            <div className="step-content">
                                <h3>Track in Real-time</h3>
                                <p>Monitor your shipment with live updates and checkpoint notifications</p>
                            </div>
                        </div>
                        <div className="step-connector"></div>
                        <div className="step">
                            <div className="step-number">4</div>
                            <div className="step-content">
                                <h3>Receive & Rate</h3>
                                <p>Confirm delivery and rate your experience to help the community</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* For Transporters */}
            <section className="for-transporters">
                <div className="container">
                    <div className="transporters-content">
                        <div className="transporters-text">
                            <span className="section-badge badge-accent">For Transporters</span>
                            <h2>Maximize Your Earnings, Minimize Empty Miles</h2>
                            <ul className="benefits-list">
                                <li>
                                    <CheckCircle size={20} />
                                    <span>Find return trip loads to eliminate empty miles</span>
                                </li>
                                <li>
                                    <CheckCircle size={20} />
                                    <span>Route-compatible shipment matching</span>
                                </li>
                                <li>
                                    <CheckCircle size={20} />
                                    <span>Transparent pricing with fuel cost calculator</span>
                                </li>
                                <li>
                                    <CheckCircle size={20} />
                                    <span>Build your reputation with verified ratings</span>
                                </li>
                                <li>
                                    <CheckCircle size={20} />
                                    <span>Easy checkpoint updates with photo verification</span>
                                </li>
                            </ul>
                            <Link to="/register?role=transporter" className="btn btn-accent btn-lg">
                                Join as Transporter
                                <ArrowRight size={20} />
                            </Link>
                        </div>
                        <div className="transporters-visual">
                            <div className="dashboard-preview glass">
                                <div className="preview-header">
                                    <div className="preview-dots">
                                        <span></span><span></span><span></span>
                                    </div>
                                    <span>Transporter Dashboard</span>
                                </div>
                                <div className="preview-content">
                                    <div className="preview-stat">
                                        <Users size={24} />
                                        <div>
                                            <span className="preview-value">₹45,230</span>
                                            <span className="preview-label">This Week</span>
                                        </div>
                                    </div>
                                    <div className="preview-stat">
                                        <Route size={24} />
                                        <div>
                                            <span className="preview-value">12</span>
                                            <span className="preview-label">Active Routes</span>
                                        </div>
                                    </div>
                                    <div className="preview-stat">
                                        <Star size={24} />
                                        <div>
                                            <span className="preview-value">4.9</span>
                                            <span className="preview-label">Rating</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="cta">
                <div className="container">
                    <div className="cta-content glass">
                        <h2>Ready to Transform Your Logistics?</h2>
                        <p>Join thousands of businesses and transporters already using LogiFlow</p>
                        <div className="cta-actions">
                            <Link to="/register" className="btn btn-primary btn-lg">
                                Get Started Free
                                <ArrowRight size={20} />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <div className="container">
                    <div className="footer-content">
                        <div className="footer-brand">
                            <div className="logo">
                                <div className="logo-icon">
                                    <Truck size={24} />
                                </div>
                                <span className="logo-text">LogiFlow</span>
                            </div>
                            <p>The intelligent logistics platform for modern freight transportation.</p>
                        </div>
                        <div className="footer-links">
                            <div className="footer-column">
                                <h4>Product</h4>
                                <a href="#features">Features</a>
                                <a href="#pricing">Pricing</a>
                                <a href="#api">API</a>
                            </div>
                            <div className="footer-column">
                                <h4>Company</h4>
                                <a href="#about">About</a>
                                <a href="#careers">Careers</a>
                                <a href="#contact">Contact</a>
                            </div>
                            <div className="footer-column">
                                <h4>Legal</h4>
                                <a href="#privacy">Privacy</a>
                                <a href="#terms">Terms</a>
                            </div>
                        </div>
                    </div>
                    <div className="footer-bottom">
                        <p>&copy; 2026 LogiFlow. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
