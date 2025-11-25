
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat, Part } from "@google/genai"; // Import Chat and Part
import { analyzePlantImage, fileToBase64, sendMessageToChat, MODEL_NAME_TEXT } from './services/geminiService'; // Import new functions and MODEL_NAME_TEXT
import LoadingSpinner from './components/LoadingSpinner';
import ReactMarkdown from 'react-markdown';

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

interface ImageContext {
  file: File;
  analysis: string;
}

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [diseaseResult, setDiseaseResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Chatbot states
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const [currentChatSession, setCurrentChatSession] = useState<Chat | null>(null);
  const [currentImageContext, setCurrentImageContext] = useState<ImageContext | null>(null);

  const chatMessagesEndRef = useRef<HTMLDivElement>(null); // Ref for auto-scrolling chat

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isChatOpen]);

  // Effect to initialize or reset chat session
  useEffect(() => {
    if (!isChatOpen) return; // Only initialize if chat is open

    const initializeChat = async () => {
      // If no session exists AND we have image context, or chat is open and context changes, create/re-prime chat
      if (!currentChatSession && currentImageContext) {
        setIsChatLoading(true);
        try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const newChat = ai.chats.create({
            model: MODEL_NAME_TEXT,
            config: {
              systemInstruction: "You are a helpful assistant specialized in plant diseases. Answer questions based on the previously provided image context and its initial analysis. Be concise and informative.",
            }
          });

          // Prime the chat with the image and its analysis as the initial conversation context
          const imagePart: Part = {
            inlineData: {
              mimeType: currentImageContext.file.type,
              data: await fileToBase64(currentImageContext.file),
            },
          };
          
          const initialChatHistory = [
            {
              role: 'user' as const, // Type assertion for 'user' role
              parts: [
                imagePart,
                { text: "I uploaded this image of a plant for disease detection. Here is the initial analysis I received:" }
              ],
            },
            {
              role: 'model' as const, // Type assertion for 'model' role
              parts: [{ text: currentImageContext.analysis }],
            },
          ];

          const chatWithHistory = ai.chats.create({
            model: MODEL_NAME_TEXT,
            history: initialChatHistory,
            config: {
              systemInstruction: "You are a helpful assistant specialized in plant diseases. Answer questions based on the previously provided image context and its initial analysis. Be concise and informative.",
            }
          });
          
          setCurrentChatSession(chatWithHistory);
          setChatMessages([
            { role: 'model', content: "Hello! I'm ready to answer more questions about the plant in the image you just analyzed." }
          ]);
        } catch (err: any) {
          console.error("Error initializing chat session:", err);
          setChatMessages([{ role: 'model', content: "Failed to start chat. Please try again." }]);
          setError(err.message || "Failed to start chat session.");
        } finally {
          setIsChatLoading(false);
        }
      } else if (!currentChatSession && !currentImageContext && chatMessages.length === 0) {
        // Chat open but no image context yet, and no prior messages
        setChatMessages([
          { role: 'model', content: "Hello! Upload and analyze an image first, then I can help you with more questions about it." }
        ]);
      }
    };

    // If currentImageContext changes and chat is open, reset session
    if (isChatOpen && currentImageContext && currentChatSession && currentImageContext.analysis !== diseaseResult) {
      setCurrentChatSession(null); // Force re-initialization
      setChatMessages([]); // Clear messages
    }
    initializeChat();

  }, [isChatOpen, currentImageContext, currentChatSession, diseaseResult]); // Dependencies

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setDiseaseResult(null);
      setError(null);
      // Reset chat context and messages when a new image is selected
      setCurrentImageContext(null);
      setCurrentChatSession(null);
      setChatMessages([]);
    }
  };

  const handleDetectDisease = useCallback(async () => {
    if (!selectedFile) {
      setError("Please select an image first.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setDiseaseResult(null);

    try {
      const geminiResponse = await analyzePlantImage(selectedFile);
      setDiseaseResult(geminiResponse);
      // Store the image and its analysis for chat context
      setCurrentImageContext({ file: selectedFile, analysis: geminiResponse });
      // If chat is open, prompt user to ask more questions
      if (isChatOpen) {
          setChatMessages(prev => [...prev, { role: 'model', content: "I've analyzed the image. What else would you like to know about it?" }]);
      }
    } catch (err: any) {
      console.error("Detection error:", err);
      setError(err.message || "An unknown error occurred during detection.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedFile, isChatOpen]);

  const toggleChat = useCallback(() => {
    setIsChatOpen(prev => !prev);
    // Optionally clear chat messages when closing, or keep them
    // if (!isChatOpen) setChatMessages([]);
  }, []);

  const handleChatInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setChatInput(event.target.value);
  };

  const handleSendChatMessage = useCallback(async () => {
    if (!chatInput.trim() || !currentChatSession) return;

    const userMessage = chatInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      let fullResponse = '';
      for await (const chunk of sendMessageToChat(currentChatSession, userMessage)) {
        fullResponse += chunk;
        setChatMessages(prev => {
          // If the last message is from model and it's being streamed, update it
          if (prev.length > 0 && prev[prev.length - 1].role === 'model' && prev[prev.length - 1].content !== fullResponse) {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = { ...newMessages[newMessages.length - 1], content: fullResponse };
            return newMessages;
          }
          // Otherwise, add a new message
          return [...prev, { role: 'model', content: fullResponse }];
        });
      }
    } catch (err: any) {
      console.error("Error sending message to chat:", err);
      setChatMessages(prev => [...prev, { role: 'model', content: "Sorry, I couldn't process that. Please try again." }]);
      setError(err.message || "Failed to send message to chatbot.");
    } finally {
      setIsChatLoading(false);
    }
  }, [chatInput, currentChatSession]);


  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !isChatLoading) {
      handleSendChatMessage();
    }
  };


  return (
    <div className="flex flex-col items-center justify-center p-4 min-h-screen w-full relative">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-4xl w-full">
        <h1 className="text-3xl font-bold text-center mb-6 text-green-700">
          Plant Disease Detector
        </h1>

        <div className="mb-6">
          <label
            htmlFor="file-upload"
            className="block text-lg font-medium text-gray-700 mb-2"
          >
            Upload a plant image
          </label>
          <input
            id="file-upload"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500
                       file:mr-4 file:py-2 file:px-4
                       file:rounded-full file:border-0
                       file:text-sm file:font-semibold
                       file:bg-green-50 file:text-green-700
                       hover:file:bg-green-100"
            aria-label="Upload plant image"
          />
        </div>

        {previewUrl && (
          <div className="mb-6 flex flex-col items-center">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">
              Image Preview
            </h2>
            <img
              src={previewUrl}
              alt="Plant Preview"
              className="max-w-full h-auto rounded-lg shadow-md border border-gray-200"
              style={{ maxHeight: '400px', objectFit: 'contain' }}
            />
          </div>
        )}

        <div className="sticky bottom-0 bg-white p-4 border-t border-gray-200 -mx-8 -mb-8 flex justify-center z-10">
          <button
            onClick={handleDetectDisease}
            disabled={!selectedFile || isLoading}
            className="w-full sm:w-auto px-8 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md
                       hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-75
                       disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            aria-live="polite"
          >
            {isLoading ? 'Detecting...' : 'Detect Disease'}
          </button>
        </div>

        {isLoading && (
          <div className="mt-8">
            <LoadingSpinner />
          </div>
        )}

        {error && (
          <div
            className="mt-8 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md"
            role="alert"
          >
            <p className="font-bold">Error!</p>
            <p>{error}</p>
          </div>
        )}

        {diseaseResult && (
          <div className="mt-8 p-6 bg-green-50 rounded-lg shadow-inner border border-green-200">
            <h2 className="text-2xl font-bold text-green-800 mb-4">
              Detection Result:
            </h2>
            <div className="prose max-w-none text-gray-800">
              <ReactMarkdown>{diseaseResult}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>

      {/* Chatbot Floating Icon */}
      <button
        onClick={toggleChat}
        className="fixed bottom-4 right-4 bg-green-600 text-white p-4 rounded-full shadow-lg
                   hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-75
                   z-50 flex items-center justify-center w-14 h-14"
        aria-label={isChatOpen ? "Close chatbot" : "Open chatbot"}
      >
        {isChatOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.597 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
        )}
      </button>

      {/* Chatbot Window */}
      {isChatOpen && (
        <div
          className="fixed bottom-20 right-4 w-full max-w-sm bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col z-40
                     max-h-[80vh] md:max-h-[600px]"
          role="dialog"
          aria-labelledby="chat-header"
        >
          <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-green-50 rounded-t-lg">
            <h3 id="chat-header" className="text-lg font-semibold text-green-700">
              Chat about the Plant
            </h3>
            <button
              onClick={toggleChat}
              className="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300 rounded-full p-1"
              aria-label="Close chat"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-4" aria-live="polite">
            {chatMessages.length === 0 && isChatLoading && (
                <div className="flex justify-center text-gray-500">
                    <LoadingSpinner />
                </div>
            )}
            {chatMessages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] p-3 rounded-lg shadow-md ${
                    msg.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-800'
                  }`}
                >
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            ))}
            <div ref={chatMessagesEndRef} /> {/* For auto-scrolling */}
          </div>

          <div className="p-4 border-t border-gray-200 flex items-center">
            <input
              type="text"
              value={chatInput}
              onChange={handleChatInputChange}
              onKeyDown={handleKeyDown}
              placeholder={currentImageContext ? "Ask a follow-up question..." : "Analyze an image first..."}
              className="flex-1 p-2 border border-gray-300 rounded-lg mr-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              disabled={isChatLoading || !currentImageContext}
              aria-label="Chat input field"
            />
            <button
              onClick={handleSendChatMessage}
              disabled={isChatLoading || !chatInput.trim() || !currentImageContext}
              className="bg-green-600 text-white p-2 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500
                         disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Send message"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;