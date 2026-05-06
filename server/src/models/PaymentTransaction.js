import mongoose from 'mongoose';

const paymentTransactionSchema = new mongoose.Schema(
  {
    billId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bill',
      required: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    transactionId: {
      type: String,
      required: true,
      unique: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'BDT' },
    paymentMethod: {
      type: String,
      enum: ['CARD', 'MOBILE_BANKING', 'DEMO'],
      required: true,
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED'],
      required: true,
      default: 'SUCCESS',
    },
    isDemo: { type: Boolean, default: false },
    metadata: {
      // Demo-mode specifics (never store real card/OTP data)
      maskedCard: String,    // e.g. "****-****-****-4242"
      mobileNumber: String,  // e.g. "017*****00"
      bankName: String,
    },
    paidAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const PaymentTransaction = mongoose.model('PaymentTransaction', paymentTransactionSchema);
