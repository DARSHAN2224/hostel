import mongoose from 'mongoose'

const credentialSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  role: {
    type: String,
    required: true
  },
  // Stored as plain text per project requirement; consider encrypting in production
  password: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
})

export default mongoose.model('Credential', credentialSchema)
