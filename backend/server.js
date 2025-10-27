import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import sgMail from "@sendgrid/mail";
import axios from "axios";
import mongoose from "mongoose";
import Ticket from "./models/Ticket.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Atlas connected"))
  .catch((err) => console.log(err));

const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL;

// ✅ Generate AI Reply
async function generateAIReply(userMessage, userName = "Customer") {
  const prompt = `
You are a friendly customer support assistant.
Customer ${userName} wrote:

"${userMessage}"

Write a kind, clear, and human-like support reply that addresses their concern and ends warmly.
  `;

  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: OPENROUTER_MODEL,
        messages: [
          { role: "system", content: "You are a helpful and polite support agent." },
          { role: "user", content: prompt },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return (
      response.data?.choices?.[0]?.message?.content ||
      `Thanks for your message, ${userName}. We’ll look into this soon!`
    );
  } catch (err) {
    console.error("AI error:", err.message);
    return `Thanks ${userName}, we’ve received your reply and will get back shortly.`;
  }
}

// ✅ Create Ticket (initial complaint)
app.post("/api/ticket", async (req, res) => {
  const { name, email, complaint } = req.body;
  if (!name || !email || !complaint)
    return res.status(400).json({ success: false, error: "All fields required." });

  try {
    const aiReply = await generateAIReply(complaint, name);

    // send email
    const msg = {
      to: email,
      from: process.env.SENDER_EMAIL,
      subject: "Re: Your Complaint",
      text: aiReply,
    };
    await sgMail.send(msg);

    const ticket = await Ticket.create({
      name,
      email,
      complaint,
      aiReply,
      status: "in-progress",
      replies: [
        { sender: "user", message: complaint },
        { sender: "ai", message: aiReply },
      ],
    });

    res.json({ success: true, ticket });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ User follow-up reply
app.post("/api/ticket/reply", async (req, res) => {
  const { email, message } = req.body;
  if (!email || !message)
    return res.status(400).json({ success: false, error: "Email and message required." });

  try {
    const ticket = await Ticket.findOne({ email });
    if (!ticket)
      return res.status(404).json({ success: false, message: "Ticket not found for this email." });

    const aiReply = await generateAIReply(message, ticket.name);

    ticket.replies.push({ sender: "user", message });
    ticket.replies.push({ sender: "ai", message: aiReply });
    ticket.updatedAt = Date.now();
    await ticket.save();

    await sgMail.send({
      to: email,
      from: process.env.SENDER_EMAIL,
      subject: "Re: Your Complaint (Follow-up)",
      text: aiReply,
    });

    res.json({ success: true, aiReply });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ Get ticket + history
app.get("/api/ticket/status/:email", async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ email: req.params.email });
    if (!ticket)
      return res.status(404).json({ success: false, message: "Ticket not found." });
    res.json({ success: true, ticket });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
