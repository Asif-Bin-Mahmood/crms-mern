import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { UserRole } from '../utils/enums.js';

const customerProfileSchema = new mongoose.Schema(
  {
    phnNum: String,
    email: String,
    card: String,
    dateJoined: Date,
    houseNo: String,
    streetNo: String,
    city: String,
  },
  { _id: false }
);

const technicianProfileSchema = new mongoose.Schema(
  {
    email: String,
    phnNum: String,
    availabilityStatus: { type: Boolean, default: true },
    hourlyRate: { type: Number, default: 0 },
  },
  { _id: false }
);

const leadTechSchema = new mongoose.Schema(
  {
    certificationLevel: String,
    managementArea: String,
  },
  { _id: false }
);

const juniorTechSchema = new mongoose.Schema(
  {
    mentorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    trainingFocus: String,
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: Object.values(UserRole),
      required: true,
    },
    customerProfile: customerProfileSchema,
    technicianProfile: technicianProfileSchema,
    leadTechnicianProfile: leadTechSchema,
    juniorTechnicianProfile: juniorTechSchema,
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = function comparePassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.statics.hashPassword = async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
};

export const User = mongoose.model('User', userSchema);
