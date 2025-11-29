const API_URL = 'http://localhost:8000/api'; // Adjust this URL if your backend is running elsewhere

export const loginAdmin = async (email, password) => {
  const response = await fetch(`${API_URL}/auth/admin/login/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  return response.json();
};

export const loginAgency = async (email, password) => {
  const response = await fetch(`${API_URL}/auth/agency/login/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  return response.json();
};

export const registerAgency = async (userData) => {
  const response = await fetch(`${API_URL}/register-agency/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });
  return response.json();
};
