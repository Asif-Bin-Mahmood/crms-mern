import mongoose from "mongoose";
import { BidStatus } from "../utils/enums.js";

const bidSchema = new mongoose.Schema(
  {
    repairRequestId: { type: mongoose.Schema.Types.ObjectId, ref: "RepairRequest", required: true },
    technicianId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    estimatedAmount: { type: Number, required: true, min: 0 },
    estimatedDays: { type: Number, required: true, min: 1 },
    message: { type: String, default: "" },
    status: { type: String, enum: Object.values(BidStatus), default: BidStatus.PENDING },
  },
  { timestamps: true }
);

bidSchema.index({ repairRequestId: 1, technicianId: 1 }, { unique: true });

export const Bid = mongoose.model("Bid", bidSchema);
