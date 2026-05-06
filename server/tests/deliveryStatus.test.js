import { describe, expect, it } from 'vitest';
import { DeliveryJobStatus } from '../src/utils/enums.js';

describe('delivery status contract', () => {
  it('defines every status used by the delivery workflow', () => {
    const workflowStatuses = [
      'PENDING_PICKUP',
      'GOING_TO_CUSTOMER',
      'PICKED_UP',
      'AT_WAREHOUSE',
      'PENDING_TECH_DELIVERY',
      'GOING_TO_TECHNICIAN',
      'AT_TECHNICIAN',
      'PENDING_RETURN',
      'GOING_TO_WAREHOUSE_RETURN',
      'AT_WAREHOUSE_FINAL',
      'PENDING_CUSTOMER_DELIVERY',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'CANCELLED',
    ];

    for (const status of workflowStatuses) {
      expect(DeliveryJobStatus[status]).toBe(status);
    }
  });
});
