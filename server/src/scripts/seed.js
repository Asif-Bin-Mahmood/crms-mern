import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectDb } from '../config/db.js';
import { User } from '../models/User.js';
import { Device } from '../models/Device.js';
import { RepairRequest } from '../models/RepairRequest.js';
import { Bill } from '../models/Bill.js';
import { SparePart } from '../models/SparePart.js';
import { AssignedTo } from '../models/AssignedTo.js';
import { UserRole, RepairStatus, PaymentStatus, Priority, DeviceType } from '../utils/enums.js';

async function run() {
  await connectDb();

  // Clean up ALL seed data fully
  await User.deleteMany({ email: /@crms\.test$/ });
  await SparePart.deleteMany({ partName: /^Seed / });

  // Create users
  const admin = await User.create({
    name: 'Admin User',
    email: 'admin@crms.test',
    passwordHash: await User.hashPassword('admin123'),
    role: UserRole.ADMIN,
  });

  const customer = await User.create({
    name: 'Test Customer',
    email: 'customer@crms.test',
    passwordHash: await User.hashPassword('customer123'),
    role: UserRole.CUSTOMER,
    customerProfile: {
      phnNum: '01700000000',
      email: 'customer@crms.test',
      dateJoined: new Date(),
      houseNo: '12',
      streetNo: '5',
      city: 'Dhaka',
    },
  });

  const lead = await User.create({
    name: 'Lead Tech',
    email: 'lead@crms.test',
    passwordHash: await User.hashPassword('lead123'),
    role: UserRole.LEAD_TECHNICIAN,
    technicianProfile: { email: 'lead@crms.test', phnNum: '01800000000', hourlyRate: 500 },
    leadTechnicianProfile: { certificationLevel: 'L3', managementArea: 'Hardware' },
  });

  await User.create({
    name: 'Junior Tech',
    email: 'junior@crms.test',
    passwordHash: await User.hashPassword('junior123'),
    role: UserRole.JUNIOR_TECHNICIAN,
    technicianProfile: { email: 'junior@crms.test', phnNum: '01900000000', hourlyRate: 300 },
    juniorTechnicianProfile: { mentorId: lead._id, trainingFocus: 'Diagnostics' },
  });

  await User.create({
    name: 'Delivery Man',
    email: 'delivery@crms.test',
    passwordHash: await User.hashPassword('delivery123'),
    role: UserRole.DELIVERY_MAN,
  });

  await SparePart.create([
    { partName: 'Seed RAM 8GB', stockLevel: 20, unitCost: 2500, supplierName: 'PartsCo', reorderThreshold: 5 },
    { partName: 'Seed SSD 256GB', stockLevel: 3, unitCost: 4500, supplierName: 'PartsCo', reorderThreshold: 5 },
  ]);

  // --- Demo devices for the test customer ---
  const laptop = await Device.create({
    customerId: customer._id,
    dType: DeviceType.LAPTOP,
    manufacturer: 'Dell',
    model: 'Inspiron 15 3000',
    serialNo: 'DL-SEED-001',
  });

  const phone = await Device.create({
    customerId: customer._id,
    dType: DeviceType.MOBILE,
    manufacturer: 'Samsung',
    model: 'Galaxy A54',
    serialNo: 'SM-SEED-002',
  });

  // --- Demo repair requests ---
  const repair1 = await RepairRequest.create({
    customerId: customer._id,
    deviceId: laptop._id,
    issueDescription: 'Screen flickering and random shutdowns',
    priority: Priority.HIGH,
    currentStatus: RepairStatus.IN_PROGRESS,
    estimatedCompletionDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
  });

  const repair2 = await RepairRequest.create({
    customerId: customer._id,
    deviceId: phone._id,
    issueDescription: 'Battery draining fast, phone overheating',
    priority: Priority.MEDIUM,
    currentStatus: RepairStatus.PENDING,
    estimatedCompletionDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
  });

  const repair3 = await RepairRequest.create({
    customerId: customer._id,
    deviceId: laptop._id,
    issueDescription: 'Keyboard keys not working properly',
    priority: Priority.LOW,
    currentStatus: RepairStatus.COMPLETED,
    estimatedCompletionDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  });

  // Assign lead tech to repair1
  await AssignedTo.create({ repairRequestId: repair1._id, technicianId: lead._id, roleInRepair: 'LEAD' });

  // --- Demo bills ---
  const billPending = await Bill.create({
    repairRequestId: repair3._id,
    customerId: customer._id,
    paymentStatus: PaymentStatus.PENDING,
    laborCharge: 800,
    tax: 104,
    partsCost: 2500,
    dateGenerated: new Date(),
  });

  const billPaid = await Bill.create({
    repairRequestId: repair1._id,
    customerId: customer._id,
    paymentStatus: PaymentStatus.PAID,
    laborCharge: 1200,
    tax: 156,
    partsCost: 4500,
    dateGenerated: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  });

  // eslint-disable-next-line no-console
  console.log('Seed complete:', {
    admin: admin.email,
    customer: customer.email,
    lead: lead.email,
    devices: [laptop.model, phone.model],
    repairs: 3,
    bills: { pending: billPending._id.toString(), paid: billPaid._id.toString() },
  });

  await mongoose.disconnect();
}

run().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
