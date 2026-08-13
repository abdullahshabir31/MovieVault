# 🎬 MovieVault

> 🚧 **Project Status: Under Development**

MovieVault is a modern full-stack movie tracking and discovery web application designed to help users discover movies, manage their personal movie collection, and keep track of movies they have watched.

The project is currently under active development. More features, improvements, and refinements will be added as development continues.

## ✨ Features

- 🎬 Discover and explore movies
- 🔍 Search for movies
- ⭐ Add movies to your personal collection
- 👀 Track watched movies
- 👤 Personal user profiles
- 🔐 Secure authentication
- 🔑 Google Sign-In
- 🖼️ Profile avatar support
- 🗄️ Cloud-based database
- 🛡️ Row Level Security (RLS)
- 🎞️ Movie data powered by TMDB
- 📱 Responsive design
- ⚡ Fast and modern React architecture

> **Note:** Some features are still being developed and may change during the development process.

## 🛠️ Tech Stack

### Frontend

- React
- JavaScript
- JSX
- TanStack Start
- Vite
- Tailwind CSS
- Radix UI
- Lucide React

### Backend & Database

- Supabase
- PostgreSQL
- Supabase Authentication
- Supabase Storage
- Row Level Security (RLS)

### External API

- TMDB API

## 🔐 Authentication

MovieVault uses Supabase Authentication for secure user authentication.

Supported authentication methods include:

- Email & Password
- Google OAuth

User-specific data is protected using PostgreSQL Row Level Security policies.

## 🗄️ Database

MovieVault uses PostgreSQL through Supabase.

The application uses database structures for:

- User profiles
- Movie collections
- User-specific movie data

Row Level Security (RLS) ensures that users can only access data they are authorized to access.

## 🎞️ TMDB API

Movie information is powered by The Movie Database (TMDB) API.

TMDB provides movie-related information such as:

- Movie titles
- Posters
- Release dates
- Ratings
- Descriptions
- Movie details

## 📁 Project Structure

MovieVault/
├── public/
├── src/
│ ├── components/
│ ├── routes/
│ ├── lib/
│ └── ...
├── supabase/
│ └── migrations/
├── .env.example
├── .gitignore
├── package.json
├── vite.config.js
└── README.md

## 🚀 Getting Started

### Prerequisites

Before running MovieVault locally, make sure you have:

- Node.js
- npm
- A Supabase project
- A TMDB API key

### 1. Clone the Repository

git clone https://github.com/abdullahshabir31/MovieVault.git

### 2. Navigate to the Project

cd MovieVault

### 3. Install Dependencies

npm install

### 4. Configure Environment Variables

Create a `.env` file using `.env.example` as a reference.

The following environment variables are required:

VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=

SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=

TMDB_API_KEY=

> ⚠️ Never commit your `.env` file or expose your Supabase service role key.

### 5. Start the Development Server

npm run dev

The application will run locally at:

http://localhost:5173

## 🏗️ Build

To create a production build:

npm run build

## 🔒 Security

MovieVault uses environment variables for sensitive configuration.

The following credentials should never be committed to the repository:

- Supabase Service Role Key
- Supabase credentials
- TMDB API credentials
- Other private environment variables

The `.env` file is excluded from version control through `.gitignore`.

## 🚧 Development Status

MovieVault is currently under development.

The current version focuses on establishing the core application structure, authentication, Supabase integration, movie data integration, and user-specific movie management.

Additional features, UI improvements, optimizations, and production-ready functionality will be added as development continues.

This README will also be updated as the project evolves.

## 🔮 Planned Improvements

- 🎯 Personalized movie recommendations
- 📊 Movie statistics
- ⭐ User ratings and reviews
- 💬 Comments and discussions
- 👥 Social features
- 🔔 Notifications
- 🎨 UI/UX improvements
- 📱 Progressive Web App support
- ⚡ Performance optimizations
- 🚀 Production deployment

## 👨‍💻 Author

Abdullah Shabir

GitHub:
https://github.com/abdullahshabir31

## 📄 License

This project is currently being developed as a personal/educational project.

---

MovieVault — Your personal movie collection, discovery and tracking platform.

© 2026 Abdullah. All rights reserved.
