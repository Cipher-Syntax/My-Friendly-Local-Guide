# My Friendly Local Guide

My Friendly Local Guide is a full-stack travel platform that connects tourists with local guides and agencies. This repository contains the web frontend and Django backend used by the platform.

## Repository Overview

```
My-Friendly-Local-Guide/
  backend/      # Django + Django REST Framework API
  frontend/     # React + Vite web client
  ERD.erd       # Database model reference
```

## Core Modules (Backend)

- `user_authentication` - user account, login, token flow
- `destinations_and_attractions` - places and destination content
- `accommodation_booking` - booking and accommodation flow
- `agency_management_module` - agency operations and approvals
- `communication` - messaging and communication endpoints
- `payment` - payment and payout integrations
- `reviews_ratings` - reviews and ratings
- `report` - reporting endpoints

## Prerequisites

- Python 3.10+ (3.11 recommended)
- Node.js 18+ (Node.js 20 LTS recommended)
- npm 9+
- Git

## Quick Start

### 1) Backend Setup (Django API)

1. Move to backend folder:

	```bash
	cd backend
	```

2. Create virtual environment:

	```bash
	python -m venv .venv
	```

3. Activate the virtual environment:

- Windows PowerShell:

  ```powershell
  .\.venv\Scripts\Activate.ps1
  ```

- Windows CMD:

  ```cmd
  .\.venv\Scripts\activate.bat
  ```

4. Install dependencies:

	```bash
	pip install -r requirements.txt
	```

5. Create a `.env` file in `backend/` with required settings (example below).

6. Apply migrations:

	```bash
	python manage.py migrate
	```

7. (Optional) Create admin user:

	```bash
	python manage.py createsuperuser
	```

8. Run backend server:

	```bash
	python manage.py runserver 0.0.0.0:8000
	```

Backend default URL: `http://127.0.0.1:8000`

### 2) Frontend Setup (React + Vite)

1. Open a new terminal and move to frontend folder:

	```bash
	cd frontend
	```

2. Install dependencies:

	```bash
	npm install
	```

3. Create `.env` file in `frontend/`:

	```env
	VITE_API_URL=http://127.0.0.1:8000
	```

4. Start development server:

	```bash
	npm run dev
	```

Frontend default URL: `http://localhost:5173`

## Backend `.env` Template

Create `backend/.env` and provide real values for your environment:

```env
SECRET_KEY=django-insecure-change-me
DEBUG=True

CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
CORS_ALLOW_CREDENTIALS=True
CSRF_TRUSTED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

DATABASE_URL=sqlite:///db.sqlite3
ACCESS_LIFETIME_TOKEN=1
REFRESH_TOKEN_LIFETIME=7

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

PAYMONGO_SECRET_KEY=your_paymongo_secret_key
PAYMONGO_BASE_URL=https://api.paymongo.com
PAYMONGO_RETURN_URL=http://localhost:5173/payment/callback
PAYMONGO_API_URL=https://api.paymongo.com/v1

BACKEND_BASE_URL=http://127.0.0.1:8000
FRONTEND_URL=http://localhost:5173
BLACKLIST_AFTER_ROTATION=True

ANYMAIL_API_KEY=
DEFAULT_FROM_EMAIL=no-reply@example.com
ADMIN_SUPPORT=support@example.com

GOOGLE_CLIENT_ID=your_google_client_id
CRON_SECRET_KEY=replace_with_secure_random_value
EXPO_ACCESS_TOKEN=
```

## Useful Commands

### Backend

- `python manage.py runserver`
- `python manage.py migrate`
- `python manage.py makemigrations`
- `python manage.py test`

### Frontend

- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run lint`

## Notes for Localynk Mobile App Integration

- The mobile app in `localynk/` should point to this backend.
- Set `EXPO_PUBLIC_API_URL` in the Localynk `.env` file to your reachable backend URL.
