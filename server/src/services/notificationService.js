import { Notification } from '../models/Notification.js';
import { DeliveryType, NotificationTarget } from '../utils/enums.js';

export async function notifyRepairEvent(repairRequestId, message, target = NotificationTarget.CUSTOMER, deliveryType = DeliveryType.EMAIL) {
  return Notification.create({
    repairRequestId,
    target,
    messageContent: message,
    deliveryType,
    timeStamp: new Date(),
  });
}
