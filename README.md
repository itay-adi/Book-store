# Book Store App 📚

This is a full-stack Book Store web application built using **Node.js**, **Express.js**, **MongoDB**, and **Mongoose**.

## Features

- 🛒 Browse and view books
- 👤 User authentication (sign up, login, logout)
- 🛍 Add books to cart and place orders
- 📦 Admin area for managing books
- 🔒 CSRF protection and hashed passwords
- 📄 Server-side rendering using EJS

## Technologies Used

- Node.js
- Express.js
- MongoDB + Mongoose
- EJS (Embedded JavaScript templates)
- express-session & connect-mongodb-session
- bcryptjs (for password hashing)
- csurf (for CSRF protection)
- multer (for file uploads, if enabled)
- dotenv (for environment variable management)

## Getting Started

### Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/)
- [MongoDB](https://www.mongodb.com/)

### Installation

1. Clone the repository:
  git clone https://github.com/YOUR-USERNAME/book-store-app.git
  cd book-store-app

2. Install dependencies:
  npm install

3. Set up environment variables:
   MONGODB_URI=your_mongodb_connection_string
   SESSION_SECRET=your_secret_string
   API_KEY=your_api_key

4. Run the app:
   npm start [The app should be running at http://localhost:3000]

