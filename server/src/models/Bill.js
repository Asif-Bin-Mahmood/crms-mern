import mongoose from 'mongoose';
import { PaymentStatus } from '../utils/enums.js';

const billSchema = new mongoose.Schema(
  {
    repairRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RepairRequest',
      required: true,
      unique: true,
      index: true,
    },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    dateGenerated: { type: Date, default: Date.now },
    paymentStatus: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
    },
    laborCharge: { type: Number, required: true, min: 0, default: 0 },
    tax: { type: Number, required: true, min: 0, default: 0 },
    partsCost: { type: Number, required: true, min: 0, default: 0 },
  },
  { timestamps: true }
);

billSchema.methods.getTotalAmount = function getTotalAmount() {
  return Number(this.laborCharge) + Number(this.tax) + Number(this.partsCost);
};

export const Bill = mongoose.model('Bill', billSchema);
