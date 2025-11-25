INTRODUCTION:
Plants often show early signs of disease, but many people struggle to identify what’s wrong just by looking at leaves. This inspired me to build a simple web application where anyone can upload a plant leaf photo and instantly get an AI-powered diagnosis. The app analyzes the image, tells you what disease it may have, explains the symptoms, and suggests remedies you can try at home. It also includes a built-in chatbot, so you can ask follow-up questions like “How do I prevent this in the future?” or “Is this harmful to other plants?”

The entire system runs directly in the browser and uses Google’s Gemini AI models behind the scenes to understand both images and text. Finally, the app is deployed on Google Cloud Run, which makes it fast, secure, and accessible on any device.

Design:
The architecture consists of a React TypeScript frontend that runs entirely in the browser, using the GenAI SDK google/genaito call the Gemini image model for disease detection and the Gemini chat model gemini-2.5-flash for follow-up conversation. The frontend is exported from Gemini AI Studio and deployed on Google Cloud Run as a static container (NGINX). This design choice removes the need for servers, routing, or databases, making it highly scalable, low-maintenance, and ideal for rapid deployment.

Rationale & Impact

No backend means easier maintenance and lower cost.
Multimodal models (image + chat) enable richer user experiences.
Serverless deployment on Cloud Run provides HTTPS, autoscaling, and global access.
Users get instant insight into plant health in a mobile-friendly UI.
Press enter or click to view image in full size

Prerequisites:
Node.js (v18+) and npm installed
A Google Cloud project with Cloud Run permission
Gemini API access via GenAI SDK (@google/genai)
Basic React and TypeScript knowledge
Tailwind CSS for styling (optional)
Familiarity with bundlers (Parcel) or you can adapt to Create React App / Vite
Step-by-step instructions:
Start with the user flow
Plan how the app works: the user uploads a leaf image, the app analyzes it, and displays the disease, remedies, and confidence level.

Design the frontend UI
Create simple screens for image upload, preview, results display, and a small floating chatbot for follow-up questions.

Prepare the prompts for analysis
Write clear instructions for the AI model to identify diseases, explain symptoms, return remedies, and provide a confidence score.

Process the image on the browser
When the user uploads a leaf photo, convert it on the client side into a format that can be sent to the AI model.

Send the image to the AI model
The frontend sends the processed image along with your prompt to the AI model, which analyzes it and generates disease information.

Display the results
Receive the model’s output, extract the disease name, symptoms, remedies, and confidence, and show them clearly in the UI.

Enable follow-up Q&A
The chatbot uses the initial analysis as context so users can ask questions like prevention tips or severity and get relevant answers.

Deploy the app to Cloud Run
Build the frontend as static files, deploy it on Cloud Run, and use environment variables for API keys so the app works securely online.

Result:
A mobile-friendly web page where you upload a leaf image.
Instant preview and “Detect Disease” button.
Diagnosis card showing disease name, explanation, remedies, and confidence score.
Floating chat icon—click it, ask a follow-up like “What else can I do to prevent it?” and get intelligent responses based on the same image.
Fully live at a Cloud Run HTTPS URL, accessible from any device.
Press enter or click to view image in full size

What’s Next?
Add support for multiple plant types or diseases (expand model prompt or switch models).
Add offline image preprocessing or edge inferencing for offline use.
Incorporate user feedback or save logs (if you extend to the backend).
Build a mobile-first PWA version and add push notifications.
Call to action
To learn more about Google Cloud services and to create impact for the work you do, get around to these steps right away:

Register for Code Vipassana sessions

Join the meetup group Datapreneur Social

Sign up to become Google Cloud Innovator


