import { useState } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [form, setForm] = useState({ name: "", email: "", complaint: "" });
  const [replyData, setReplyData] = useState({ email: "", message: "" });
  const [ticket, setTicket] = useState(null);
  const [notification, setNotification] = useState({ show: false, type: "", text: "" });

  const showNotify = (type, text) => {
    setNotification({ show: true, type, text });
    setTimeout(() => setNotification({ show: false, type: "", text: "" }), 3000);
  };

  const handleComplaint = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:5000/api/ticket", form);
      showNotify("success", "✅ Complaint submitted successfully!");
      setForm({ name: "", email: "", complaint: "" });
    } catch {
      showNotify("error", "❌ Error submitting complaint.");
    }
  };

  const sendReply = async () => {
    try {
      await axios.post("http://localhost:5000/api/ticket/reply", replyData);
      showNotify("success", "💬 AI replied to your message!");
      setReplyData({ email: "", message: "" });
    } catch {
      showNotify("error", "⚠️ Failed to send reply.");
    }
  };

  const checkStatus = async (email) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/ticket/status/${email}`);
      if (res.data.ticket) {
        setTicket(res.data.ticket);
      } else {
        setTicket(null);
        showNotify("error", "❌ No ticket found for this email.");
      }
    } catch {
      showNotify("error", "⚠️ Error fetching status.");
    }
  };

  return (
    <div className="container">
      <h1 className="title">🤖 ResolveAI</h1>

      {/* ✅ Notification */}
      {notification.show && (
        <div className={`notification ${notification.type}`}>
          {notification.text}
        </div>
      )}

      {/* Complaint Form */}
      <form onSubmit={handleComplaint} className="card">
        <h2>📩 Submit Complaint</h2>
        <input
          type="text"
          placeholder="Your Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          type="email"
          placeholder="Your Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <textarea
          placeholder="Describe your complaint..."
          value={form.complaint}
          onChange={(e) => setForm({ ...form, complaint: e.target.value })}
        ></textarea>
        <button className="btn btn-primary">Submit</button>
      </form>

      {/* Reply Form */}
      <div className="card">
        <h2>💬 Send Reply to AI</h2>
        <input
          type="email"
          placeholder="Your Email"
          value={replyData.email}
          onChange={(e) => setReplyData({ ...replyData, email: e.target.value })}
        />
        <textarea
          placeholder="Write your reply..."
          value={replyData.message}
          onChange={(e) => setReplyData({ ...replyData, message: e.target.value })}
        ></textarea>
        <button onClick={sendReply} className="btn btn-success">
          Send Reply
        </button>
      </div>

      {/* Status Section */}
      <div className="card">
        <h2>🔍 Check Ticket Status</h2>
        <input
          type="email"
          placeholder="Enter your email"
          onChange={(e) => checkStatus(e.target.value)}
        />
        {ticket && (
          <div className="status-box">
            <p><b>Status:</b> {ticket.status}</p>
            <div className="replies">
              {ticket.replies.map((r, i) => (
                <div key={i} className={`reply ${r.sender}`}>
                  <b>{r.sender.toUpperCase()}:</b> {r.message}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
