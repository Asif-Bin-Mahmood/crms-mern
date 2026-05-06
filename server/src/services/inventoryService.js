import { SparePart } from '../models/SparePart.js';
import { Requires } from '../models/Requires.js';
import { refreshBillPartsCost } from './billingService.js';

export async function addPartUsage(repairRequestId, sparePartId, quantityUsed) {
  const part = await SparePart.findById(sparePartId);
  if (!part) throw Object.assign(new Error('Spare part not found'), { status: 404 });

  const existing = await Requires.findOne({ repairRequestId, sparePartId });
  if (existing) {
    part.stockLevel += existing.quantityUsed;
  }

  if (part.stockLevel < quantityUsed) {
    if (existing) part.stockLevel -= existing.quantityUsed;
    await part.save();
    throw Object.assign(new Error('Insufficient stock'), { status: 400 });
  }

  part.stockLevel -= quantityUsed;
  await part.save();

  const totalCostUsed = quantityUsed * part.unitCost;

  const doc = await Requires.findOneAndUpdate(
    { repairRequestId, sparePartId },
    {
      $set: {
        repairRequestId,
        sparePartId,
        dateOfUsage: new Date(),
        quantityUsed,
        totalCostUsed,
      },
    },
    { upsert: true, new: true }
  );

  await refreshBillPartsCost(repairRequestId);

  return { requires: doc, sparePart: part };
}
