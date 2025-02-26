const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    message: String,
    date: Date,
    isRead: Boolean,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", MessageSchema);
