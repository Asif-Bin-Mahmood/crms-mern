import mongoose from 'mongoose';
import { DeliveryJobStatus } from '../utils/enums.js';

const statusHistorySchema = new mongoose.Schema(
  {
    status:    { type: String, type: String, required: true },
    note:      { type: String, default: '' },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const deliveryJobSchema = new mongoose.Schema(
  {

    repairRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RepairRequest',
      required: true,
      unique: true,         
    },

   
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    customerAddress: { type: String, required: true, trim: true },
    customerPhone:   { type: String, required: true, trim: true },

   
    deliveryManId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

  
    status: {
      type: String,
      enum: Object.values(DeliveryJobStatus),
      default: DeliveryJobStatus.PENDING_ASSIGNMENT,
    },

    
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },

    
    pickedUpAt:  { type: Date, default: null },
    deliveredAt: { type: Date, default: null },

   
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

const DeliveryJob = mongoose.model('DeliveryJob', deliveryJobSchema);
export default DeliveryJob;