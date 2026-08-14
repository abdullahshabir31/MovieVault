# 🎬 MovieVault — Movie Discovery & Tracking Platform

**MovieVault** is a modern movie discovery and tracking web application built with **React, TanStack Start, Vite, Tailwind CSS, and Supabase**.

It allows users to discover movies, search for titles, manage their personal movie collection, track watched movies, create profiles, and securely manage their data.

---

## 🌐 Live Demo

**MovieVault:** https://movie-vault-tracker.vercel.app/

---

## 📖 About

MovieVault is a modern full-stack movie tracking platform designed for movie enthusiasts who want to discover new movies and manage their personal movie collection in one place.

The application provides a personalized experience where authenticated users can:

- Discover and explore movies
- Search for movies
- Add movies to their personal collection
- Track watched movies
- Manage their profile
- Upload a profile avatar
- Sign in securely using email/password or Google
- Store user-specific data securely through Supabase

Movie information is powered by **The Movie Database (TMDB) API**, while **Supabase** provides authentication, PostgreSQL database functionality, storage, and Row Level Security.

---

# 🌐 Deployment

| Service        | Platform      | URL                                     |
| -------------- | ------------- | --------------------------------------- |
| Frontend       | Vercel        | https://movie-vault-tracker.vercel.app/ |
| Database       | Supabase      | Supabase                                |
| Authentication | Supabase Auth | Supabase                                |
| Movie Data     | TMDB API      | TMDB                                    |

---

# 🛠️ Tech Stack

## Frontend

- React
- JavaScript (ES6+)
- JSX
- TanStack Start
- Vite
- Tailwind CSS
- Radix UI
- Lucide React

## Backend & Database

- Supabase
- PostgreSQL
- Supabase Authentication
- Supabase Storage
- Row Level Security (RLS)

## External API

- TMDB API

## Deployment

- Vercel

---

# ✨ Features

## 🎬 Movie Discovery

- Discover and explore movies
- Browse movie information
- View movie details
- Movie posters and artwork
- Release dates
- Ratings
- Movie descriptions
- TMDB-powered movie data

## 🔍 Movie Search

- Search for movies
- Browse search results
- Access detailed movie information

## ⭐ Personal Movie Collection

- Add movies to personal collection
- Manage saved movies
- View personal movie collection
- Keep track of movies associated with your account

## 👀 Watched Movies

- Track watched movies
- Manage watched movie status
- Keep a personal history of watched movies

## 👤 User Profiles

- Personal user profiles
- Profile information
- Profile avatar support
- User-specific movie data

## 🔐 Authentication

- Email & Password Authentication
- Google Sign-In
- Secure user sessions
- Protected user-specific data
- Supabase Authentication

## 🗄️ Database & Storage

- PostgreSQL database
- Supabase Storage
- User-specific data
- Cloud-based data storage
- Row Level Security (RLS)

## 📱 Responsive Design

- Responsive layout
- Mobile-friendly interface
- Desktop-friendly interface
- Modern UI components

---

# 🔐 Authentication & Security

MovieVault uses **Supabase Authentication** to securely manage user accounts and sessions.

Supported authentication methods include:

- Email & Password
- Google OAuth

User-specific database access is protected using **PostgreSQL Row Level Security (RLS)**.

This ensures that authenticated users can only access and manage data they are authorized to access.

Sensitive configuration is handled through environment variables and is excluded from version control.

---

# 🗄️ Database

MovieVault uses **PostgreSQL through Supabase**.

The database is responsible for storing application and user-specific information such as:

- User profiles
- Movie collections
- Watched movie data
- User-specific movie information

Supabase provides the database infrastructure while Row Level Security policies help protect user data.

---

# 🎞️ TMDB API

MovieVault uses **The Movie Database (TMDB) API** to provide movie information.

TMDB supplies data including:

- Movie titles
- Posters
- Release dates
- Ratings
- Descriptions
- Movie details

This allows MovieVault to provide a rich movie discovery experience without maintaining its own movie database.

---

# 📂 Project Structure

```text
MovieVault/
│
├── public/
│
├── src/
│   ├── components/
│   ├── routes/
│   ├── lib/
│   └── ...
│
├── supabase/
│   └── migrations/
│
├── .env.example
├── .gitignore
├── package.json
├── vite.config.js
└── README.md
```

---

# ⚙️ Local Development

## 1. Clone Repository

```bash
git clone https://github.com/abdullahshabir31/MovieVault.git
cd MovieVault
```

---

## 2. Install Dependencies

```bash
npm install
```

---

## 3. Configure Environment Variables

Create a `.env` file using `.env.example` as a reference.

Required environment variables:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=

SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=

TMDB_API_KEY=
```

> ⚠️ Never commit your `.env` file or expose your Supabase Service Role Key.

---

## 4. Start Development Server

```bash
npm run dev
```

The application will run at:

```text
http://localhost:5173
```

---

# 🏗️ Build

To create a production build:

```bash
npm run build
```

---

# 🔒 Security

MovieVault follows secure configuration practices by keeping sensitive credentials inside environment variables.

The following credentials should never be committed to the repository:

- Supabase Service Role Key
- Supabase credentials
- TMDB API credentials
- Private environment variables

The `.env` file is excluded from version control through `.gitignore`.

Database access is additionally protected through **Row Level Security (RLS)**.

---

# 🏗️ Architecture

```text
                    React + TanStack Start
                              │
                              │
                         Vite Build
                              │
                              ▼
                           Vercel
                              │
                              │
                    Supabase Client
                              │
                ┌─────────────┴─────────────┐
                │                           │
                ▼                           ▼
        Supabase Auth                 PostgreSQL
                │                           │
                │                           │
                ▼                           ▼
        User Authentication          Row Level Security
                │
                ▼
        Supabase Storage
                │
                │
                ▼
          Profile Avatars


                 React Application
                        │
                        │
                        ▼
                    TMDB API
                        │
                        ▼
                Movie Information
```

---

# 📊 Project Highlights

- Modern React Application
- TanStack Start Architecture
- Vite-powered development and build system
- Supabase Backend Infrastructure
- PostgreSQL Database
- Supabase Authentication
- Google OAuth
- Row Level Security
- Supabase Storage
- TMDB Movie API Integration
- Personal Movie Collection
- Watched Movie Tracking
- User Profiles
- Profile Avatar Support
- Responsive UI
- Secure Environment Configuration
- Production Deployment on Vercel

---

# 🚀 Live Project

### 🎬 MovieVault

**Live Application:**

https://movie-vault-tracker.vercel.app/

**GitHub Repository:**

https://github.com/abdullahshabir31/MovieVault

---

# 👨‍💻 Author

## Abdullah Shabir

### Connect With Me

- **GitHub:** https://github.com/abdullahshabir31
- **LinkedIn:** https://www.linkedin.com/in/abdullahshabir31/
- **Portfolio:** https://abdullah-myportfolio.vercel.app/

---

## ⭐ Support

If you found MovieVault interesting or useful, consider giving the repository a ⭐ on GitHub.

---

**MovieVault — Your personal movie discovery, collection, and tracking platform.**
