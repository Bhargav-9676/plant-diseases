const express = require('express');
const { Firestore } = require('@google-cloud/firestore');
const cors = require('cors');
// Optional: Use dotenv for local development to load .env variables
// require('dotenv').config(); 

const app = express();
const port = process.env.PORT || 8080;

// Initialize Firestore
const db = new Firestore();

// Configure CORS
const corsOptions = {
  origin: '*', // IMPORTANT: In production, change this to your frontend's actual domain (e.g., 'https://your-frontend-domain.com')
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));
app.use(express.json()); // Enable JSON body parsing

// Root endpoint for health check
app.get('/', (req, res) => {
  res.status(200).send('Plant Disease Detector Backend is running!');
});

// Endpoint to save plant detection results to Firestore
app.post('/api/detections', async (req, res) => {
  try {
    const { originalFilename, mimeType, geminiResult } = req.body;

    if (!originalFilename || !mimeType || !geminiResult) {
      return res.status(400).send({ error: 'Missing required fields: originalFilename, mimeType, geminiResult' });
    }

    const newDetection = {
      originalFilename,
      mimeType,
      geminiResult,
      timestamp: new Date().toISOString(),
    };

    const docRef = await db.collection('plantDetections').add(newDetection);
    console.log('Document written with ID: ', docRef.id);
    res.status(201).send({ message: 'Detection result saved successfully!', id: docRef.id });

  } catch (error) {
    console.error('Error saving detection result to Firestore:', error);
    res.status(500).send({ error: 'Failed to save detection result.' });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
