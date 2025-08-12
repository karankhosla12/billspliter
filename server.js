// server.js
import express from "express";
import dotenv from "dotenv";
import { OpenAI } from "openai";
import cors from "cors"; // ✅ Import CORS

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Enable CORS for all origins (or restrict to your frontend domain)
app.use(cors({
    origin: "*", // Change to your frontend domain for security (e.g., "https://yourdomain.com")
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

// Parse incoming JSON
app.use(express.json());

// Hugging Face client using OpenAI SDK
const client = new OpenAI({
    baseURL: "https://router.huggingface.co/v1",
    apiKey: process.env.HF_TOKEN, // Set this in Render's environment variables
});

// API endpoint
app.post("/api/analyze", async (req, res) => {
    try {
        const { prompt, imageUrl } = req.body;

        if (!imageUrl) {
            return res.status(400).json({ error: "imageUrl is required" });
        }

        const chatCompletion = await client.chat.completions.create({
            model: "zai-org/GLM-4.5V:novita",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: prompt ||
                                "Convert the image of a bill into key-value pairs, including taxes as a key-value pair."
                        },
                        {
                            type: "image_url",
                            image_url: { url: imageUrl }
                        }
                    ]
                }
            ]
        });

        res.json(chatCompletion.choices[0].message);
    } catch (error) {
        console.error("Error in /api/analyze:", error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
