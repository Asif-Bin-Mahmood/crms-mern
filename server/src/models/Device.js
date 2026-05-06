import mongoose from 'mongoose';
import { DeviceType } from '../utils/enums.js';

const deviceSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    dType: { type: String, enum: Object.values(DeviceType), required: true },
    manufacturer: { type: String, required: true },
    model: { type: String, required: true },
    serialNo: { type: String, required: true },
  },
  { timestamps: true }
);

deviceSchema.index({ customerId: 1, serialNo: 1 }, { unique: true });

export const Device = mongoose.model('Device', deviceSchema);
