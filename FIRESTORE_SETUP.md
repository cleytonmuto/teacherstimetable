# Firestore Setup Guide

## Common Firebase Connection Issues and Solutions

### Issue 1: Firestore Database Not Created

**Symptoms:**

-   Error code: `failed-precondition` or `unavailable`
-   Message: "Firestore is unavailable"

**Solution:**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **fir-react-5d6b7**
3. Click on **Firestore Database** in the left menu
4. Click **Create database** button
5. Choose **Start in test mode** (for development)
6. Select a location (choose the closest to your users)
7. Click **Enable**

### Issue 2: Permission Denied

**Symptoms:**

-   Error code: `permission-denied`
-   Message: "Firestore permission denied"

**Solution:**

1. Go to Firebase Console > Firestore Database > Rules
2. Update your security rules to allow connection testing:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow connection test
    match /_connection_test/{document=**} {
      allow read, write: if true;
    }

    // Timetable collection - users can only access their own entries
    match /timetable/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.teacherId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.teacherId;
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
  }
}
```

### Issue 3: Authentication Not Enabled

**Symptoms:**

-   Auth connection fails
-   Cannot register/login

**Solution:**

1. Go to Firebase Console > Authentication
2. Click **Get started** if you haven't enabled it
3. Go to **Sign-in method** tab
4. Enable **Email/Password** provider
    - **Note**: Although Firebase requires Email/Password provider, the application only uses CPF for authentication. The email format is only used internally by Firebase and is never displayed to users.
5. Click **Save**

### Issue 4: Environment Variables Not Loaded

**Symptoms:**

-   Configuration validation fails
-   Missing environment variables error

**Solution:**

1. Make sure you have a `.env` file in the root directory
2. Restart the development server after creating/updating `.env`
3. Verify the file contains:

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### Quick Diagnostic Steps

1. **Check Firebase Status Page:**

    - Navigate to `http://localhost:5173/firebase-status`
    - Review the error messages and suggested solutions

2. **Check Browser Console:**

    - Open Developer Tools (F12)
    - Look for Firebase initialization messages
    - Check for any error messages

3. **Verify Firebase Project:**

    - Go to Firebase Console
    - Verify project is active
    - Check billing status (free tier should work)

4. **Test Connection:**
    - The status page will automatically test Auth and Firestore
    - Follow the specific error messages for solutions

### Test Mode Security Rules (Development Only)

For development, you can use test mode rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2025, 12, 31);
    }
  }
}
```

**⚠️ Warning:** These rules allow full access. Only use for development. Update to production rules before deploying.

### Production Security Rules

For production, use these secure rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Connection test (optional, can be removed in production)
    match /_connection_test/{document=**} {
      allow read, write: if false; // Disable in production
    }

    // Timetable - users can only access their own entries
    match /timetable/{documentId} {
      allow read, write, delete: if request.auth != null && request.auth.uid == resource.data.teacherId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.teacherId;
    }

    // Users - users can read their own data, create their own document
    match /users/{userId} {
      // Allow system initialization document (created on app start)
      allow read, write: if userId == '_system_init';

      // Allow reading own document
      allow read: if request.auth != null && request.auth.uid == userId;
      // Allow creating own document during registration
      allow create: if request.auth != null && request.auth.uid == userId;
      // Allow updating own document
      allow update: if request.auth != null && request.auth.uid == userId;
      // Allow querying for login lookup (all authenticated users can query)
      allow read: if request.auth != null;
    }
  }
}
```
