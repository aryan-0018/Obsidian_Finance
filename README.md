## Obsidian Finance – Curating Elite Wealth 

AI-powered financial management platform built with the MERN stack.

![MERN Stack](https://img.shields.io/badge/MERN-Stack-blue?logo=react)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=white)
![Google Gemini AI](https://img.shields.io/badge/Google_Gemini-AI-orange?logo=google)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)


## Application Access

**Live Application :**  https://obsidian-finance.vercel.app

**Backend API :**  https://obsidian-finance-backend.onrender.com


Obsidian Finance enables intelligent financial analysis, secure user authentication, automated insights, and real-time expense tracking through a modern and scalable architecture.

## ✨ Key Features

- **Comprehensive Dashboard:** Interactive charts and data visualizations using `recharts`.
- **AI-Powered Insights:** Integration with Google Gemini AI for smart financial advice and data interpretation.
- **Secure Authentication:** JWT, Google OAuth integration, and secure password hashing.
- **Transactions Management:** Easily track, categorize, and manage your income and expenses.
- **Cloud Storage:** Image and media handling using Cloudinary.
- **Modern UI/UX:** Built with React, Radix UI components, Tailwind CSS v4.
- **Automated Tasks:** Background cron jobs for financial summaries and alerts.

## 🛠️ Tech Stack

### Frontend (Client)
- **Framework:** React 18.2.0 + Vite
- **Styling:** Tailwind CSS v4, Radix UI, Class Variance Authority
- **State Management:** Redux Toolkit, Redux Persist
- **Routing:** React Router v7
- **Forms & Validation:** React Hook Form + Zod
- **Charts:** Recharts

### Backend (Server)
- **Environment:** Node.js + Express
- **Database:** MongoDB + Mongoose
- **Authentication:** Passport.js (JWT, Google OAuth), bcryptjs
- **AI Integration:** Google GenAI SDK (`@google/genai`)
- **File Uploads:** Multer + Cloudinary
- **Emails:** Resend

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- MongoDB instance (local or Atlas)
- Google Cloud Console Project (for OAuth and Gemini AI)
- Cloudinary Account
- Resend Account (for emails)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/aryan-0018/Obsidian_Finance.git
   cd Obsidian_Finance
   ```

2. **Install Backend Dependencies:**
   ```bash
   cd backend
   npm install
   ```

3. **Install Frontend Dependencies:**
   ```bash
   cd ../client
   npm install
   ```

### ⚙️ Environment Variables

Create a `.env` file in both the `backend` and `client` directories.

**Backend (`backend/.env`):**
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
GEMINI_API_KEY=your_gemini_api_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
RESEND_API_KEY=your_resend_api_key
```

**Frontend (`client/.env`):**
```env
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
```

### 🏃‍♂️ Running the Application

1. **Start the Backend:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start the Frontend:**
   ```bash
   cd client
   npm run dev
   ```

The application will be available locally at `http://localhost:5173/`.

## 📄 License

This project is licensed under the MIT License.
