import express from "express";
import { OpenAI } from "openai";

const app = express();
app.use(express.json());

const client = new OpenAI({
    baseURL: "https://router.huggingface.co/v1",
    apiKey: process.env.HF_TOKEN, // Set in Render environment variables
});

app.post("/api/analyze", async (req, res) => {
    try {
        const { imageUrl } = req.body;

        const chatCompletion = await client.chat.completions.create({
            model: "zai-org/GLM-4.5V:novita", // Hugging Face model
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: "Convert the image of a bill into key value pairs along with the taxes as a key value pair" },
                        { type: "image_url", image_url: { url: imageUrl } },
                    ],
                },
            ],
        });

        res.json(chatCompletion.choices[0].message);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
