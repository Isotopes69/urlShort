require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log("Connected to MongoDB Atlas"))
  .catch(err => console.log("MongoDB Connection Error:", err));

// Define Schema
const urlSchema = new mongoose.Schema({
    short: { type: String, unique: true, required: true },
    long: { type: String, required: true },
});

const URL = mongoose.model("URL", urlSchema);

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Function to generate a short URL
const generateShort = async () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let short;
    do {
        short = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    } while (await URL.findOne({ short }));
    return short;
};

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/shorten', async (req, res) => {
    const longUrl = req.body.url;
    if (!longUrl) return res.status(400).json({ error: "URL is required" });

    let existingEntry = await URL.findOne({ long: longUrl });
    if (existingEntry) {
        return res.json({ short_url: `https://your-vercel-app.vercel.app/${existingEntry.short}` });
    }

    const shortUrl = await generateShort();
    try {
        const newUrl = new URL({ short: shortUrl, long: longUrl });
        await newUrl.save();
        res.json({ short_url: `https://your-vercel-app.vercel.app/${newUrl.short}` });
    } catch (error) {
        res.status(500).json({ error: "Database error", message: error.message });
    }
});

app.get('/:short', async (req, res) => {
    const urlEntry = await URL.findOne({ short: req.params.short });
    if (urlEntry) return res.redirect(urlEntry.long);
    res.status(404).send("URL not found");
});

// Export for Vercel
module.exports = app;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));