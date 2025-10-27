import mongoose from "mongoose";

const replySchema = new mongoose.Schema({
  sender: String, // "user" or "ai"
  message: String,
  time: { type: Date, default: Date.now },
});

const ticketSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    complaint: String,
    aiReply: String,
    status: { type: String, enum: ["in-progress", "solved"], default: "in-progress" },
    replies: [replySchema],
  },
  { timestamps: true }
);

export default mongoose.model("Ticket", ticketSchema);
