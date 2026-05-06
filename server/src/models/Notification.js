import mongoose from 'mongoose';
import { DeliveryType, NotificationTarget } from '../utils/enums.js';

const notificationSchema = new mongoose.Schema(
  {
    repairRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RepairRequest',
      required: true,
      index: true,
    },
    target: { type: String, enum: Object.values(NotificationTarget), required: true },
    messageContent: { type: String, required: true },
    deliveryType: { type: String, enum: Object.values(DeliveryType), default: DeliveryType.EMAIL },
    timeStamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Notification = mongoose.model('Notification', notificationSchema);
