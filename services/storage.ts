
import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL, uploadString } from 'firebase/storage';

export const uploadFile = async (file: File, folder: string): Promise<string> => {
  // Offline Guard
  if (!navigator.onLine) {
      throw new Error("Cannot upload files while offline. Please try again when connected.");
  }

  try {
    const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const storageRef = ref(storage, `${folder}/${fileName}`);
    
    const snapshot = await uploadBytes(storageRef, file);
    const url = await getDownloadURL(snapshot.ref);
    return url;
  } catch (error) {
    console.error("File upload failed:", error);
    throw new Error("File upload failed");
  }
};

export const uploadBlob = async (blob: Blob, path: string): Promise<string> => {
    if (!navigator.onLine) {
        throw new Error("Cannot upload files while offline.");
    }
    try {
        const storageRef = ref(storage, path);
        const snapshot = await uploadBytes(storageRef, blob);
        const url = await getDownloadURL(snapshot.ref);
        return url;
    } catch (error) {
        console.error("Blob upload failed:", error);
        throw new Error("PDF upload failed");
    }
};

export const uploadDataUrl = async (dataUrl: string, folder: string): Promise<string> => {
  // Offline Fallback: Return special marker + base64 to store in Firestore temporarily
  if (!navigator.onLine) {
      return `OFFLINE_PENDING::${folder}::${dataUrl}`;
  }

  try {
    const fileName = `${Date.now()}_image.png`;
    const storageRef = ref(storage, `${folder}/${fileName}`);
    
    // uploadString automatically detects data_url format
    const snapshot = await uploadString(storageRef, dataUrl, 'data_url');
    const url = await getDownloadURL(snapshot.ref);
    return url;
  } catch (error) {
    console.error("Image upload failed:", error);
    // Fallback to offline mode on error too
    return `OFFLINE_PENDING::${folder}::${dataUrl}`;
  }
};
