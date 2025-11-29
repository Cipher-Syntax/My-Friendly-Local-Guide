import React, { useState } from 'react';
import { registerAgency } from '../api/auth';

const AgencyRegistrationForm = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirm_password: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    location: '',
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const response = await registerAgency(formData);
      if (response.id) {
        setSuccess(true);
      } else {
        setError(response.detail || 'Registration failed');
      }
    } catch (err) {
      setError('An error occurred during registration.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: '400px', padding: '2rem', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>Register as an Agency</h2>
      {success ? (
        <p style={{ color: 'green' }}>
          Registration successful! Please check your email to verify your account.
        </p>
      ) : (
        <form onSubmit={handleSubmit}>
          {/* Add form fields for registration data */}
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="username">Username</label>
            <input type="text" id="username" name="username" onChange={handleChange} style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem' }} required />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="email">Email</label>
            <input type="email" id="email" name="email" onChange={handleChange} style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem' }} required />
          </div>
          {/* Add other fields similarly */}
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="password">Password</label>
            <input type="password" id="password" name="password" onChange={handleChange} style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem' }} required />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="confirm_password">Confirm Password</label>
            <input type="password" id="confirm_password" name="confirm_password" onChange={handleChange} style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem' }} required />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="first_name">First Name</label>
            <input type="text" id="first_name" name="first_name" onChange={handleChange} style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem' }} />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="last_name">Last Name</label>
            <input type="text" id="last_name" name="last_name" onChange={handleChange} style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem' }} />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="phone_number">Phone Number</label>
            <input type="text" id="phone_number" name="phone_number" onChange={handleChange} style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem' }} />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="location">Location</label>
            <input type="text" id="location" name="location" onChange={handleChange} style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem' }} />
          </div>
          {error && <p style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>}
          <button type="submit" style={{ width: '100%', padding: '0.5rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }} disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
      )}
    </div>
  );
};

export default AgencyRegistrationForm;
