import PDFDocument from 'pdfkit';
import { PaymentTransaction } from '../models/PaymentTransaction.js';
import { Bill } from '../models/Bill.js';
import { requireAuth } from '../middlewares/auth.js';

/**
 * GET /api/payment/demo/receipt/:transactionId
 * Generates and streams a PDF receipt for a completed demo payment.
 * The transactionId is used to look up the PaymentTransaction record.
 */
export async function generateReceipt(req, res) {
  try {
    const { transactionId } = req.params;

    // Find transaction
    const tx = await PaymentTransaction.findOne({ transactionId })
      .populate({ path: 'billId', populate: { path: 'repairRequestId' } })
      .populate('customerId');

    if (!tx) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    const bill = tx.billId;
    const customer = tx.customerId;
    const paidAt = new Date(tx.paidAt);
    const total = Number(tx.amount || 0).toFixed(2);
    const invoiceNo = `INV-${bill?._id?.toString().slice(-8).toUpperCase() || 'N/A'}`;

    // ── Stream PDF response ────────────────────────────────────────────────────
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="CRMS-Receipt-${transactionId}.pdf"`
    );

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    doc.pipe(res);

    const W = doc.page.width - 100; // usable width

    // ── Header block ──────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 90).fill('#1e40af');

    doc.fillColor('#ffffff')
      .font('Helvetica-Bold')
      .fontSize(22)
      .text('CRMS Payment Receipt', 50, 28, { width: W });

    doc.fontSize(11)
      .font('Helvetica')
      .fillColor('#bfdbfe')
      .text('Computer Repair Management System', 50, 56);

    // Demo badge (top-right)
    doc.rect(doc.page.width - 140, 20, 100, 24).fill('#dc2626');
    doc.fillColor('#ffffff')
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('DEMO MODE', doc.page.width - 140, 28, { width: 100, align: 'center' });

    // ── Subheader: invoice + amount ───────────────────────────────────────────
    doc.rect(50, 100, W, 46).fill('#eff6ff');
    doc.fillColor('#1e40af')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text(`Invoice: ${invoiceNo}`, 64, 114);
    doc.fillColor('#1e40af')
      .fontSize(18)
      .font('Helvetica-Bold')
      .text(`BDT ${total}`, 50, 110, { width: W, align: 'right' });

    // ── Status banner ─────────────────────────────────────────────────────────
    doc.rect(50, 156, W, 36).fill('#dcfce7');
    doc.fillColor('#166534')
      .fontSize(13)
      .font('Helvetica-Bold')
      .text('Payment Successful', 64, 167);

    // ── Info table ────────────────────────────────────────────────────────────
    const rows = [
      ['Customer Name',  customer?.name  || 'Demo Customer'],
      ['Customer Email', customer?.email || 'demo@crms.test'],
      ['Invoice No.',    invoiceNo],
      ['Transaction ID', transactionId],
      ['Payment Method', tx.paymentMethod || '-'],
      tx.metadata?.maskedCard   ? ['Card No.',   tx.metadata.maskedCard]   : null,
      tx.metadata?.mobileNumber ? ['Mobile No.', tx.metadata.mobileNumber] : null,
      ['Repair Issue',  (bill?.repairRequestId?.issueDescription || 'Repair Service').substring(0, 70)],
      ['Labour Charge', `BDT ${Number(bill?.laborCharge || 0).toFixed(2)}`],
      ['Parts Cost',    `BDT ${Number(bill?.partsCost   || 0).toFixed(2)}`],
      ['Tax',           `BDT ${Number(bill?.tax         || 0).toFixed(2)}`],
      ['Total Paid',    `BDT ${total}`],
      ['Payment Date',  paidAt.toLocaleString('en-GB')],
      ['Mode',          'Demo Simulator — Not a Real Transaction'],
    ].filter(Boolean);

    let y = 206;
    rows.forEach(([label, value], i) => {
      const rowBg = i % 2 === 0 ? '#f8fafc' : '#ffffff';
      doc.rect(50, y, W, 24).fill(rowBg);

      doc.fillColor('#6b7280')
        .fontSize(10)
        .font('Helvetica')
        .text(label, 64, y + 7, { width: 160 });

      doc.fillColor('#111827')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(String(value), 230, y + 7, { width: W - 180 });

      y += 24;
    });

    // ── Watermark text (diagonal simulation — two lines) ─────────────────────
    doc.fillColor('#e5e7eb')
      .fontSize(9)
      .font('Helvetica-Oblique')
      .text('** DEMO PAYMENT — NOT A REAL TRANSACTION **', 50, y + 16, {
        width: W, align: 'center',
      });

    // ── Footer ────────────────────────────────────────────────────────────────
    const footerY = doc.page.height - 70;
    doc.rect(0, footerY, doc.page.width, 70).fill('#f8fafc');
    doc.fillColor('#9ca3af')
      .fontSize(8)
      .font('Helvetica-Oblique')
      .text(
        'DEMO PAYMENT — NOT A REAL TRANSACTION. For testing and QA purposes only.',
        50, footerY + 16, { width: W, align: 'center' }
      )
      .text(
        'Computer Repair Management System (CRMS)',
        50, footerY + 32, { width: W, align: 'center' }
      );

    doc.end();
  } catch (err) {
    console.error('[generateReceipt] error:', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
