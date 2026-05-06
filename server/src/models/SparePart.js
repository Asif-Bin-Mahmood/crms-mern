import mongoose from 'mongoose';

const sparePartSchema = new mongoose.Schema(
  {
    partName: { type: String, required: true },
    stockLevel: { type: Number, required: true, min: 0, default: 0 },
    unitCost: { type: Number, required: true, min: 0 },
    supplierName: { type: String, required: true },
    reorderThreshold: { type: Number, required: true, min: 0, default: 5 },
  },
  { timestamps: true }
);

sparePartSchema.methods.isLowStock = function isLowStock() {
  return this.stockLevel <= this.reorderThreshold;
};

export const SparePart = mongoose.model('SparePart', sparePartSchema);
