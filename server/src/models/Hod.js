import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const HodSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  department: { type: String, required: true },
  phone: { type: String },
  createdBy: { type: Schema.Types.ObjectId, ref: 'Admin' }, // Super admin who created
  updatedBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Hod = mongoose.model('Hod', HodSchema);
export default Hod;