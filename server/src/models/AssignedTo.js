import mongoose from 'mongoose';
import { RoleInRepair } from '../utils/enums.js';

const assignedToSchema = new mongoose.Schema(
  {
    technicianId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    repairRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RepairRequest',
      required: true,
      index: true,
    },
    assignedDate: { type: Date, default: Date.now },
    roleInRepair: { type: String, enum: Object.values(RoleInRepair), default: RoleInRepair.SUPPORT },
  },
  { timestamps: true }
);

assignedToSchema.index({ technicianId: 1, repairRequestId: 1 }, { unique: true });

export const AssignedTo = mongoose.model('AssignedTo', assignedToSchema);
