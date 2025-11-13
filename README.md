# Teachers Timetable Management

A React application for managing teachers' weekly timetables. Teachers can log in, register, and organize their weekly schedules. The application uses Google Firebase for authentication and data persistence.

## Features

- 🔐 User authentication (Login/Register) with Firebase Auth
- 👥 Two user profiles: Regular teachers and Coordinators
- 📅 Weekly timetable view (Monday to Saturday)
- ⏰ Time slots from 8:00 AM to 5:00 PM
- ➕ Add, view, and delete timetable entries
- 📚 Subject management (Coordinators can register subjects)
- 👀 View all teachers' timetables (Coordinators only)
- 💾 Data persistence with Firebase Firestore
- 🎨 Modern, responsive UI

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use an existing one
3. Enable Authentication:
   - Go to Authentication > Sign-in method
   - Enable "Email/Password" provider
   - **Note**: Although Firebase requires Email/Password provider, the application only uses CPF for authentication. Email format is only used internally by Firebase and is never shown to users.
4. Create a Firestore Database:
   - Go to Firestore Database
   - Create database in production mode (or test mode for development)
5. Get your Firebase configuration:
   - Go to Project Settings > General
   - Scroll down to "Your apps" section
   - Click on the web icon (</>) to add a web app
   - Copy the Firebase configuration object

### 3. Environment Variables

Create a `.env` file in the root directory with your Firebase credentials:

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

Replace the placeholder values with your actual Firebase configuration values.

### 4. Firestore Security Rules

Update your Firestore security rules to allow authenticated users to read/write their own timetable data and user credentials:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow connection test
    match /_connection_test/{document=**} {
      allow read, write: if true;
    }
    
    // Users collection - registration and login
    match /users/{userId} {
      // Allow system initialization document to be created/read without authentication
      allow read, write: if userId == '_system_init';
      
      // Allow creating document if userId matches authenticated user's ID
      allow create: if request.auth != null && request.auth.uid == userId;
      // Allow reading own document
      allow read: if request.auth != null && request.auth.uid == userId;
      // Allow querying by CPF for login lookup (all authenticated users can query)
      allow read: if request.auth != null;
    }
    
    // Timetable collection - users can only access their own entries
    // Coordinators can read all entries
    match /timetable/{documentId} {
      // Coordinators can read all timetables
      allow read: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.profile == 'coordinator';
      // Regular users can only access their own entries
      allow read, write, delete: if request.auth != null && request.auth.uid == resource.data.teacherId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.teacherId;
    }
    
    // Subjects collection - coordinators can manage, all authenticated users can read
    match /subjects/{subjectId} {
      // Coordinators can create, update, and delete subjects
      allow create, update, delete: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.profile == 'coordinator';
      // All authenticated users can read subjects
      allow read: if request.auth != null;
    }
  }
}
```

**Note**: The application stores teacher credentials in the `users` collection. Each user document:
- **Document ID**: Uses the Firebase Auth `userId` as the document ID for efficient querying
- **Document Fields**:
  - `userId`: Firebase Auth user ID (also used as document ID)
  - `cpf`: User's CPF (11 digits, no formatting)
  - `internalId`: Internal identifier for Firebase Auth (not shown to users)
  - `profile`: User profile type - `'regular'` (default) or `'coordinator'`
  - `createdAt`: Registration timestamp (Firestore Timestamp)
  - `updatedAt`: Last update timestamp (Firestore Timestamp)
  
  **Note**: Firebase Authentication requires an email format internally, but the application only uses CPF for user authentication. The internal identifier is automatically generated and stored but is never displayed to users.

### User Profiles

The application supports two user profiles:

1. **Regular Teacher** (default):
   - Can view and manage their own timetable
   - Can add time slots with subjects from the registered subjects list
   - Default profile for all new registrations

2. **Coordinator**:
   - Can register and manage subjects
   - Can view timetables of all registered teachers
   - Can filter timetables by specific teacher
   - Must be manually set in Firestore

**To set a user as Coordinator:**

1. Go to Firebase Console > Firestore Database
2. Navigate to the `users` collection
3. Find the user document (by their `userId`)
4. Edit the document and set the `profile` field to `"coordinator"`
5. Save the changes

The user will see the Coordinator Dashboard on their next login.

**Application Initialization (On App Start):**
1. Verifies Firestore connection
2. Checks if `users` collection is accessible
3. Creates system initialization document (`_system_init`) if it doesn't exist
4. Ensures collection is ready for authentication

**Registration Process:**
1. Validates CPF format and checksum
2. Checks for duplicate CPF
3. Creates Firebase Auth account
4. Persists teacher data in Firestore with verification
5. Confirms document creation before completing registration

### 5. Run the Application

```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or the port shown in the terminal).

### 6. Verify Firebase Connection

To verify that your Firebase connection is working correctly:

1. **Check the browser console** - You should see:
   - `✅ Firebase initialized successfully`
   - `📦 Project ID: your_project_id`

2. **Visit the Firebase Status page**:
   - Navigate to `http://localhost:5173/firebase-status`
   - Or click the "🔍 Check Firebase Status" link in the top-right corner (development mode only)
   - This page will test both Authentication and Firestore connections

3. **Expected results**:
   - ✅ Overall Status: Connected
   - ✅ Authentication: Connected
   - ✅ Firestore: Connected

If you see any errors:

#### Common Issues and Solutions:

1. **Firestore Database Not Created:**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project: **fir-react-5d6b7**
   - Go to **Firestore Database**
   - Click **"Create database"** if it doesn't exist
   - Choose **"Start in test mode"** for development
   - See [FIRESTORE_SETUP.md](./FIRESTORE_SETUP.md) for detailed instructions

2. **Permission Denied Error:**
   - Update Firestore security rules to allow connection testing
   - Go to Firebase Console > Firestore Database > Rules
   - Add this rule for connection testing:
   ```javascript
   match /_connection_test/{document=**} {
     allow read, write: if true;
   }
   ```
   - See [FIRESTORE_SETUP.md](./FIRESTORE_SETUP.md) for complete security rules

3. **Authentication Not Enabled:**
   - Go to Firebase Console > Authentication
   - Click **"Get started"** if needed
   - Enable **Email/Password** provider
   - Click **Save**

4. **Environment Variables Not Loaded:**
   - Ensure `.env` file exists in root directory
   - Restart development server after creating/updating `.env`
   - Verify all variables are set (no `your_` placeholders)

5. **Check Browser Console:**
   - Open Developer Tools (F12)
   - Look for Firebase initialization messages
   - Check for specific error codes and messages
   - The status page will show detailed error information

For more detailed troubleshooting, see [FIRESTORE_SETUP.md](./FIRESTORE_SETUP.md)

## Usage

1. **Register/Login**: 
   - First-time users can register with their CPF (Brazilian tax ID) and password
   - Existing users can log in with their CPF and password
   - CPF will be automatically formatted (XXX.XXX.XXX-XX) as you type

2. **Manage Timetable**:
   - Click on any empty time slot to add a class
   - Fill in the subject name and room number
   - Click "Save" to add the entry
   - Click the "×" button on any entry to delete it

3. **View Schedule**:
   - The dashboard displays your weekly timetable
   - Each time slot shows the subject and room number

## Project Structure

```
src/
├── components/
│   ├── Dashboard.tsx      # Main timetable dashboard
│   ├── Dashboard.css
│   ├── Login.tsx          # Login/Register page (CPF-based)
│   ├── Login.css
│   ├── PrivateRoute.tsx   # Protected route component
│   └── PrivateRoute.css
├── config/
│   └── firebase.ts        # Firebase configuration
├── contexts/
│   └── AuthContext.tsx    # Authentication context (CPF-based)
├── utils/
│   └── cpfUtils.ts        # CPF formatting and validation utilities
├── App.tsx                # Main app component with routing
└── main.tsx               # Entry point
```

## Technologies Used

- React 19
- TypeScript
- Vite
- Firebase (Authentication & Firestore)
- React Router DOM

## Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```
