// IMPORTANT: Replace this with your actual Cloud Run backend URL after deployment.
// For example: `https://your-cloud-run-service-xxxxxx-uc.a.run.app`
const BACKEND_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8080';

console.log('Backend Base URL configured as:', BACKEND_BASE_URL);

/**
 * Interface for the data to be sent to the backend.
 */
interface PlantDetectionData {
  originalFilename: string;
  mimeType: string;
  geminiResult: string;
}

/**
 * Saves plant detection results to the Cloud Run backend.
 * @param data The plant detection data to save.
 * @returns A promise that resolves if the data is saved successfully, or rejects on error.
 */
export async function savePlantDetectionResult(data: PlantDetectionData): Promise<void> {
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/api/detections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Backend responded with status ${response.status}`);
    }

    // Optionally, parse and log the success message from the backend
    const successData = await response.json();
    console.log("Backend save successful:", successData);

  } catch (error) {
    console.error("Error saving detection result to backend:", error);
    throw new Error(`Failed to save detection result to database: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}