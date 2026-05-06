import mongoose from 'mongoose';
import { Priority, RepairStatus } from '../utils/enums.js';

const repairRequestSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', required: true, index: true },
    issueDescription: { type: String, required: true },
    priority: { type: String, enum: Object.values(Priority), default: Priority.MEDIUM },
    currentStatus: {
      type: String,
      enum: Object.values(RepairStatus),
      default: RepairStatus.PENDING,
    },
    estimatedCompletionDate: Date,
    // Delivery-related fields — stored here so DeliveryJob can read them
    customerAddress: { type: String, default: '' },
    customerPhone:   { type: String, default: '' },
  },
  { timestamps: true }
);

export const RepairRequest = mongoose.model('RepairRequest', repairRequestSchema);
