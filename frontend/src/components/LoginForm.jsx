import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { loginAdmin, loginAgency } from '../api/auth';

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // First, try to log in as an admin
      let response = await loginAdmin(email, password);

      if (response.access) {
        // Handle successful admin login
        console.log('Admin login successful');
        // You might want to store the token and redirect
      } else {
        // If admin login fails, try to log in as an agency
        response = await loginAgency(email, password);

        if (response.access) {
          // Handle successful agency login
          console.log('Agency login successful');
          // You might want to store the token and redirect
        } else {
          setError(response.detail || 'Invalid credentials');
        }
      }
    } catch (err) {
      setError('An error occurred during login.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: '300px', padding: '2rem', border: '1px solid #ccc', borderRadius: '8px' }}>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem' }}
            required
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.g.target.value)}
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem' }}
            required
          />
        </div>
        {error && <p style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>}
        <button type="submit" style={{ width: '100%', padding: '0.5rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }} disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      <p style={{ marginTop: '1rem', textAlign: 'center' }}>
        Don't have an account? <Link to="/register-agency">Register as an Agency</Link>
      </p>
    </div>
  );
};

export default LoginForm;
