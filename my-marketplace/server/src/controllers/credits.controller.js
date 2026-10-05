import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { serializeTransaction } from '../lib/serializers.js';
import {
  CREDIT_PACKAGES,
  PACKAGE_IDS,
  PAYMENT_METHODS,
  PAYMENT_METHOD_IDS,
  VODAFONE_CASH_WALLET,
} from '../lib/credits.js';

// Strip password before sending the user back.
function publicUser(user) {
  const { password, ...rest } = user;
  return rest;
}

// GET /api/credits/packages — public pricing + payment config for the UI.
export function getPackages(_req, res) {
  res.json({
    success: true,
    packages: PACKAGE_IDS.map((id) => ({ id, ...CREDIT_PACKAGES[id] })),
    methods: PAYMENT_METHOD_IDS,
    vodafone_cash_wallet: VODAFONE_CASH_WALLET,
  });
}

const purchaseSchema = z
  .object({
    package: z.enum(PACKAGE_IDS),
    method: z.enum(PAYMENT_METHOD_IDS),
    // Vodafone Cash: the wallet number the broker transferred *from*.
    sender_number: z
      .string()
      .trim()
      .min(6, 'Sender wallet number is too short')
      .max(20, 'Sender wallet number is too long')
      .optional(),
    // Optional transfer screenshot (URL from POST /api/uploads/receipt).
    receipt_url: z
      .string()
      .url()
      .optional()
      .or(z.literal('').transform(() => undefined)),
  })
  .refine((d) => d.method !== 'vodafone_cash' || Boolean(d.sender_number), {
    message: 'Sender wallet number is required for Vodafone Cash',
    path: ['sender_number'],
  });

// POST /api/credits/purchase — broker only.
//
// vodafone_cash → creates a PENDING transaction; credits are granted later,
//                 when an admin approves (see admin.controller.approveTransaction).
// card / fawry  → mock sandbox: confirmed instantly, credits granted now.
export async function purchaseCredits(req, res, next) {
  try {
    const parsed = purchaseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: parsed.error.issues.map((i) => i.message).join(', '),
      });
    }

    const { package: packageId, method } = parsed.data;
    const pkg = CREDIT_PACKAGES[packageId];
    const senderNumber = method === 'vodafone_cash' ? parsed.data.sender_number : null;
    const receiptUrl = parsed.data.receipt_url || null;

    // Mock methods confirm instantly: create as completed and grant credits in
    // one atomic transaction so the two writes can't drift apart.
    if (PAYMENT_METHODS[method].instant) {
      const [tx, user] = await prisma.$transaction([
        prisma.transaction.create({
          data: {
            brokerId: req.user.id,
            packageId,
            amount: pkg.price,
            credits: pkg.credits,
            method,
            status: 'completed',
            senderNumber,
            receiptUrl,
            reviewedAt: new Date(),
          },
        }),
        prisma.user.update({
          where: { id: req.user.id },
          data: { listingCredits: { increment: pkg.credits } },
        }),
      ]);

      return res.status(201).json({
        success: true,
        status: 'completed',
        message: `تمت إضافة ${pkg.credits} رصيد إعلانات بنجاح.`,
        transaction: serializeTransaction(tx),
        credits_added: pkg.credits,
        user: publicUser(user),
      });
    }

    // Vodafone Cash: record the request and wait for admin verification.
    const tx = await prisma.transaction.create({
      data: {
        brokerId: req.user.id,
        packageId,
        amount: pkg.price,
        credits: pkg.credits,
        method,
        status: 'pending',
        senderNumber,
        receiptUrl,
      },
    });

    return res.status(201).json({
      success: true,
      status: 'pending',
      message: 'تم استلام طلب الدفع. سيُضاف الرصيد بعد مراجعة الإدارة للتحويل.',
      transaction: serializeTransaction(tx),
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/credits/transactions — the signed-in broker's own purchase history.
export async function listMyTransactions(req, res, next) {
  try {
    const rows = await prisma.transaction.findMany({
      where: { brokerId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, transactions: rows.map(serializeTransaction) });
  } catch (err) {
    next(err);
  }
}
