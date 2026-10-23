import mongoose from 'mongoose';

const chatConversationSchema = new mongoose.Schema({
  user_id: {
    type: String,
    required: true,
    index: true
  },
  session_id: {
    type: String,
    required: true,
    index: true
  },
  role: {
    type: String,
    enum: ['user', 'model', 'system'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  structured_data: {
    type: Object,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

chatConversationSchema.index({ user_id: 1, session_id: 1, timestamp: 1 });

export const ChatConversation = mongoose.models.ChatConversation || mongoose.model('ChatConversation', chatConversationSchema);
export default ChatConversation;
