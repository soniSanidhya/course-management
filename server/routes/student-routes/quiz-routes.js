const express = require("express");
const axios = require("axios");
const mongoose = require("mongoose");

const router = express.Router();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Define Mongoose Schema
const quizSchema = new mongoose.Schema({
    topic: String,
    questions: [
        {
            question: String,
            options: [String],
            correctAnswer: String,
            userResponse: String
        }
    ],
    score: Number,
    timestamp: { type: Date, default: Date.now }
});

const Quiz = mongoose.model("Quiz", quizSchema);

// Generate Quiz
router.post("/generate-quiz", async (req, res) => {
    try {
        if (!GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY is missing. Check your .env file.");
        }

        const { topic } = req.body;
        if (!topic) {
            return res.status(400).json({ error: "Quiz topic is required" });
        }

        const prompt = `Generate a multiple-choice quiz on ${topic} with 3 questions. 
        Provide the response in strict JSON format without markdown, code blocks, or extra formatting. 
        The JSON should follow this structure: 
        {
          "questions": [
            {
              "question": "",
              "options": ["", "", "", ""],
              "answer": ""
            }
          ]
        }`;

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            { contents: [{ parts: [{ text: prompt }] }] },
            { headers: { "Content-Type": "application/json" } }
        );

        if (!response.data.candidates || !response.data.candidates[0]?.content?.parts[0]?.text) {
            throw new Error("Invalid response format from Gemini API.");
        }

        const quizData = JSON.parse(response.data.candidates[0].content.parts[0].text);
        res.json({ topic, questions: quizData.questions });
    } catch (error) {
        console.error("Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// Submit Quiz
router.post("/submit-quiz", async (req, res) => {
    try {
        const { topic, questions, userResponses } = req.body;
        if (!topic || !questions || !userResponses) {
            return res.status(400).json({ error: "Missing required data." });
        }

        let score = 0;
        const processedQuestions = questions.map((q) => {
            const isCorrect = userResponses[q.question] === q.answer;
            if (isCorrect) score++;
            return { 
                question: q.question, 
                options: q.options, 
                correctAnswer: q.answer, 
                userResponse: userResponses[q.question] || null 
            };
        });

        const quizRecord = new Quiz({ topic, questions: processedQuestions, score });
        await quizRecord.save();

        res.json({ message: "Quiz submitted successfully", score });
    } catch (error) {
        console.error("Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
