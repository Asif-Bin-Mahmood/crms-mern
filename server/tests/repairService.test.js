import { describe, it, expect } from 'vitest';
import { canTransition } from '../src/services/repairService.js';
import { RepairStatus } from '../src/utils/enums.js';

describe('repairService', () => {
  it('allows PENDING -> IN_PROGRESS', () => {
    expect(canTransition(RepairStatus.PENDING, RepairStatus.IN_PROGRESS)).toBe(true);
  });
  it('disallows COMPLETED -> anything', () => {
    expect(canTransition(RepairStatus.COMPLETED, RepairStatus.IN_PROGRESS)).toBe(false);
  });
});
