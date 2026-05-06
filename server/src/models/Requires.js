import mongoose from 'mongoose';

const requiresSchema = new mongoose.Schema(
  {
    repairRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RepairRequest',
      required: true,
      index: true,
    },
    sparePartId: { type: mongoose.Schema.Types.ObjectId, ref: 'SparePart', required: true, index: true },
    dateOfUsage: { type: Date, default: Date.now },
    quantityUsed: { type: Number, required: true, min: 1 },
    totalCostUsed: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

requiresSchema.index({ repairRequestId: 1, sparePartId: 1 }, { unique: true });

export const Requires = mongoose.model('Requires', requiresSchema);
