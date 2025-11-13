import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const HodSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  // Do not select password by default for security
  password: { type: String, required: true, select: false },
  department: { type: String, required: true },
  phone: { type: String },
  status: { type: String, default: 'active' },
  // Email verification fields (align with other auth-enabled models)
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  // Force change password after admin-created accounts
  mustChangePassword: { type: Boolean, default: false },
  // Password reset fields
  passwordResetToken: String,
  passwordResetExpires: Date,
  createdBy: { type: Schema.Types.ObjectId, ref: 'Admin' }, // Super admin who created
  updatedBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Ensure toJSON removes sensitive fields
HodSchema.set('toJSON', { virtuals: true })
HodSchema.set('toObject', { virtuals: true })

HodSchema.methods.toJSON = function() {
  const hod = this.toObject()
  delete hod.password
  delete hod.passwordResetToken
  delete hod.passwordResetExpires
  delete hod.emailVerificationToken
  delete hod.emailVerificationExpires
  delete hod.__v
  return hod
}

// Virtual for assigned students count (populate with count)
HodSchema.virtual('assignedStudentsCount', {
  ref: 'Student',
  localField: '_id',
  foreignField: 'hodId',
  count: true
})

const Hod = mongoose.model('Hod', HodSchema);
export default Hod;