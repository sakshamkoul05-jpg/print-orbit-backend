import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import prisma from './prisma';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy_id',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'rzp_test_dummy_secret',
});

// --- Payment Routes ---

// Create Order
app.post('/api/payments/create-order', async (req, res) => {
  try {
    const { amount, currency, items } = req.body;
    const options = {
      amount: amount, // in paise
      currency: currency || 'INR',
      receipt: `rcpt_${Date.now()}`,
    };
    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Verify Payment
app.post('/api/payments/verify', async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, items, amount, customer } = req.body;

    const secret = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_dummy_secret';
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body.toString())
      .digest('hex');

    if (razorpay_signature !== expectedSignature) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const order = await prisma.order.create({
      data: {
        orderNumber: `PO-${Date.now()}`,
        email: customer.email,
        subtotal: amount / 1.18,
        total: amount / 100,
        status: 'PENDING',
        paymentId: razorpay_payment_id,
        paymentStatus: 'paid',
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            productName: item.name,
            quantity: item.quantity,
            price: item.price,
            designData: item.designData ? JSON.stringify(item.designData) : null,
          })),
        },
        shippingStreet: customer.street,
        shippingCity: customer.city,
        shippingState: customer.state,
        shippingPincode: customer.pincode,
        shippingPhone: customer.phone,
      },
    });

    res.json({ success: true, orderId: order.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});
