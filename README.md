# Node.js RDS Application

A Node.js application that provides user authentication and AWS RDS database operations.

## Features
- User registration and login with in-memory storage
- AWS RDS database CRUD operations
- Secure password hashing
- Session-based authentication

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file with your AWS RDS credentials:
   ```
   DB_HOST=your-rds-endpoint
   DB_USER=your-username
   DB_PASSWORD=your-password
   DB_NAME=your-database-name
   ```

3. Run the application:
   ```bash
   npm start
   ```

## Usage
- Access the application at http://localhost:3000
- Register a new account
- Log in with your credentials
- Perform CRUD operations on the RDS database
