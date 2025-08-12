const express = require("express");
const fetch = require("node-fetch"); // Install with: npm install node-fetch express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON
app.use(express.json());

// Proxy endpoint for Hugging Face
app.post("/api/analyze", async (req, res) => {
  try {
    const { image } = req.body;

    const response = await fetch(
      "https://api-inference.huggingface.co/models/your-model-here",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: image }),
      }
    );

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
