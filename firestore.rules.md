
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // --- Helper Functions ---
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return request.auth.uid == userId;
    }
    
    // Robust Role Check: Allow direct check if user is manager or admin
    // This assumes the client app correctly sets up the user profile.
    function isManager() {
        return isAuthenticated() && (
            get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'Manager' ||
            get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'Admin'
        );
    }

    // --- Users Collection ---
    match /users/{userId} {
      // Allow reading profiles (for staff directory/search)
      allow read: if isAuthenticated();
      
      // CRITICAL: Allow finding a user by Badge ID for login (requires limit(1) query)
      allow list: if request.query.limit <= 1; 
      
      // Managers can create users (Registration) or Users can create themselves
      allow create: if isAuthenticated(); 
      
      // Only Owner or Manager can edit profile details
      allow update: if isAuthenticated() && (isOwner(userId) || isManager());
      
      // --- CPD Subcollection (Fixes CPD Fetch Error) ---
      match /cpd/{entry} {
        allow read, write: if isAuthenticated() && (isOwner(userId) || isManager());
      }

      // --- Notifications Subcollection ---
      // Allow managers to write notifications to any user
      // Allow users to read/update their own notifications
      match /notifications/{notifId} {
        allow read: if isAuthenticated() && isOwner(userId);
        allow create: if isManager() || isOwner(userId); // Manager can notify user, system/user can notify self
        allow update: if isAuthenticated() && isOwner(userId); // Mark as read
      }
    }

    // --- ePRFs (Clinical Records) ---
    match /eprfs/{document} {
      allow create: if isAuthenticated();
      // Only allow read/write if the user is in the 'accessUids' list (The crew) or is a Manager
      allow read, update: if isAuthenticated() && (request.auth.uid in resource.data.accessUids || isManager());
      allow delete: if isManager();
    }

    // --- Rota & Shifts ---
    match /shifts/{shiftId} {
      allow read: if isAuthenticated();
      
      // Managers have full control
      allow create: if isManager();
      allow delete: if isManager();
      
      // Update: Managers (edit/cancel) OR Staff (bid/time/notes)
      allow update: if isManager() || isAuthenticated();
    }

    // --- Assets (Fleet & Kits) ---
    match /fleet/{vehicle} {
      allow read: if isAuthenticated();
      allow write: if isManager(); // Fixes "Error adding asset"
      allow update: if isAuthenticated(); // Allow staff to update status via VDI
    }
    
    match /medical_kits/{kit} {
      allow read: if isAuthenticated();
      allow write: if isManager(); // Fixes "Error adding asset"
      allow update: if isAuthenticated();
    }
    
    match /asset_checks/{check} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
    }
    
    // --- Drugs & Stock ---
    match /stock/{item} {
      allow read: if isAuthenticated();
      allow update: if isAuthenticated();
    }
    
    match /drug_audit/{entry} {
      allow read: if isManager();
      allow create: if isAuthenticated();
    }

    // --- System / Communication ---
    match /system/{docId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated(); // Allow any staff to declare Major Incident
    }
    
    match /announcements/{id} {
      allow read: if isAuthenticated();
      allow write: if isManager();
    }
    
    match /kudos/{id} {
      allow read, create: if isAuthenticated();
    }
    
    match /feedback/{id} {
      allow create: if isAuthenticated();
      allow read: if isManager();
    }
    
    match /oh_referrals/{id} {
      allow create: if isAuthenticated();
      allow read: if isManager() || request.auth.uid == resource.data.userId;
    }
    
    match /major_incident_logs/{id} {
      allow read, create: if isAuthenticated();
    }

    // --- Patient Spine Mock ---
    match /patients/{patient} {
      allow read: if isAuthenticated();
    }
  }
}
