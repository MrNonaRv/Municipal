# Government Employee Record System (Local Setup)

This application is configured to run locally on your machine using a Node.js backend and a secure SQLite database.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)

## Local Installation Instructions

1. **Download the Code:**
   - Export the project as a ZIP file from the **Settings** menu in AI Studio.
   - Extract the ZIP file to a folder on your computer.

2. **Install Dependencies:**
   Open your terminal/command prompt in the extracted folder and run:
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a file named `.env` in the root directory and add a secret key for database encryption:
   ```env
   DB_ENCRYPTION_KEY=your-32-character-secret-key-here
   ```
   *Note: Use a strong, unique 32-character string to keep your data safe.*

4. **Run the Application:**
   Start the development server:
   ```bash
   npm run dev
   ```

5. **Access the App:**
   Open your browser and navigate to:
   `http://localhost:3000`

## Features

- **Local Database:** Uses SQLite (`database.sqlite`) stored directly on your computer.
- **Data Encryption:** All employee records are encrypted using AES-256-GCM before being saved.
- **Full-Stack:** Express.js backend with a React/Vite frontend.
- **Print Ready:** Professional dossiers and summary reports formatted for A4 printing.

## Security Note

The `database.sqlite` file contains your data. While it is encrypted, you should still keep this file secure. Do not share your `.env` file or the encryption key with anyone.
