// server.js
import express from "express";
import dotenv from "dotenv";
import { OpenAI } from "openai";
import cors from "cors"; // ✅ Enable CORS

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Enable CORS for all origins (change "*" to your frontend domain in production)
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

// ✅ Increase payload size limit to prevent "413 Content Too Large"
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Hugging Face client using OpenAI SDK
const client = new OpenAI({
    baseURL: "https://router.huggingface.co/v1",
    apiKey: process.env.HF_TOKEN // Set in Render's environment variables
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
                            text: prompt || "Convert the image of a bill into key-value pairs, including taxes as a key-value pair."
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
