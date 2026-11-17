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

- **Purchase Affordability Simulator:** Real-time liquidity buffer analysis and upcoming bill impact calculation before major spending decisions.
- **Financial Freedom Runway Engine:** Burn rate velocity and milestone calculations for financial independence tracking.
- **Dynamic Portfolio Balance Sync:** Real-time net cash flow computation and unified balance tracking across accounts.
- **AI-Powered Insights:** Integration with Google Gemini AI for financial advice, spending analysis, and automated categorization.
- **Telegram Copilot & Voice Terminal:** Hands-free expense logging and balance queries via Telegram bot and speech recognition.
- **Cryptographic Audit Ledger:** Sequential SHA-256 block hashing ensuring tamper-evident transaction history verification.
- **Bank Statement & Receipt Processing:** Automated transaction extraction from bank CSV/PDF statements and receipt scanning.
- **Transactions Management:** Multi-currency support with precision decimal handling, custom categories, and filters.
- **Secure Authentication:** JWT, Google OAuth integration, and secure password hashing.
- **Automated Tasks & Reports:** Background cron jobs for scheduled financial summaries and email report generation.

## 🛠️ Tech Stack

### Frontend (Client)
- **Framework:** React 18.2.0 + Vite
- **Styling & Components:** Tailwind CSS v4, Radix primitives
- **State Management:** Redux Toolkit, Redux Persist
- **Routing:** React Router v7
- **Forms & Validation:** React Hook Form + Zod
- **Charts:** Recharts

### Backend (Server)
- **Environment:** Node.js + Express + TypeScript
- **Database:** MongoDB + Mongoose
- **Authentication:** Passport.js (JWT, Google OAuth), bcryptjs
- **AI Integration:** Google GenAI SDK (`@google/genai`)
- **Telegram Bot:** Telegraf
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
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
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
