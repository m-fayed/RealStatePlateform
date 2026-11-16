import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { serializeTransaction, serializeListing } from '../lib/serializers.js';

// Shape pending broker rows for the admin panel.
function serializePendingBroker(user) {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    ad_license_no: user.adLicense,
    license_image_url: user.licenseImageUrl,
    created_at: user.createdAt,
  };
}

// GET /api/admin/registrations — pending broker accounts awaiting review.
export async function listPendingRegistrations(req, res, next) {
  try {
    const rows = await prisma.user.findMany({
      where: { role: 'broker', status: 'pending' },
      orderBy: { createdAt: 'asc' }, // oldest first — fairer queue
    });
    res.json({ success: true, registrations: rows.map(serializePendingBroker) });
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/registrations/:id/approve
export async function approveRegistration(req, res, next) {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user || user.role !== 'broker') {
      return res.status(404).json({ success: false, message: 'Broker not found' });
    }
    if (user.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot approve broker with status "${user.status}"`,
      });
    }

    await prisma.user.update({
      where: { id },
      data: { status: 'active', rejectionReason: null },
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

const rejectSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

// POST /api/admin/registrations/:id/reject — body: { reason }
export async function rejectRegistration(req, res, next) {
  try {
    const { id } = req.params;
    const parsed = rejectSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: parsed.error.issues.map((i) => i.message).join(', '),
      });
    }
    const reason = parsed.data.reason || null;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || user.role !== 'broker') {
      return res.status(404).json({ success: false, message: 'Broker not found' });
    }
    if (user.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot reject broker with status "${user.status}"`,
      });
    }

    await prisma.user.update({
      where: { id },
      data: { status: 'rejected', rejectionReason: reason },
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/statistics — counts for the dashboard, in parallel.
export async function getStatistics(req, res, next) {
  try {
    const [
      active_brokers,
      seekers,
      total_listings,
      pending_registrations,
      pending_transactions,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'broker', status: 'active' } }),
      prisma.user.count({ where: { role: 'seeker', status: 'active' } }),
      prisma.listing.count({ where: { status: 'active' } }),
      prisma.user.count({ where: { role: 'broker', status: 'pending' } }),
      prisma.transaction.count({ where: { status: 'pending' } }),
    ]);

    res.json({
      success: true,
      active_brokers,
      seekers,
      total_listings,
      pending_registrations,
      pending_transactions,
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// Credit-purchase transactions
// ---------------------------------------------------------------------------

const TX_STATUSES = ['pending', 'completed', 'rejected'];

// GET /api/admin/transactions[?status=pending] — payment requests, newest first.
// Includes the broker so the reviewer can see who paid without a second lookup.
export async function listTransactions(req, res, next) {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const where = status && TX_STATUSES.includes(status) ? { status } : {};

    const rows = await prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { broker: { select: { id: true, name: true, phone: true } } },
    });

    res.json({ success: true, transactions: rows.map(serializeTransaction) });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/transactions/:id/approve
// Flips pending -> completed and grants the broker their credits. The write is
// gated on status:'pending' inside a transaction, so two admins approving the
// same request at once can never double-credit the broker.
export async function approveTransaction(req, res, next) {
  try {
    const { id } = req.params;
    const tx = await prisma.transaction.findUnique({ where: { id } });

    if (!tx) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
    if (tx.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot approve a transaction that is "${tx.status}"`,
      });
    }

    const updated = await prisma.$transaction(async (dbtx) => {
      const gate = await dbtx.transaction.updateMany({
        where: { id, status: 'pending' },
        data: {
          status: 'completed',
          reviewedById: req.user.id,
          reviewedAt: new Date(),
          rejectionReason: null,
        },
      });
      if (gate.count === 0) return null; // lost a race — already processed
      await dbtx.user.update({
        where: { id: tx.brokerId },
        data: { listingCredits: { increment: tx.credits } },
      });
      return dbtx.transaction.findUnique({ where: { id } });
    });

    if (!updated) {
      return res.status(409).json({ success: false, message: 'Transaction already processed' });
    }

    res.json({ success: true, transaction: serializeTransaction(updated) });
  } catch (err) {
    next(err);
  }
}

const rejectTxSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

// PATCH /api/admin/transactions/:id/reject — body: { reason }. No credits granted.
export async function rejectTransaction(req, res, next) {
  try {
    const { id } = req.params;
    const parsed = rejectTxSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: parsed.error.issues.map((i) => i.message).join(', '),
      });
    }
    const reason = parsed.data.reason || null;

    const tx = await prisma.transaction.findUnique({ where: { id } });
    if (!tx) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
    if (tx.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot reject a transaction that is "${tx.status}"`,
      });
    }

    const gate = await prisma.transaction.updateMany({
      where: { id, status: 'pending' },
      data: {
        status: 'rejected',
        rejectionReason: reason,
        reviewedById: req.user.id,
        reviewedAt: new Date(),
      },
    });
    if (gate.count === 0) {
      return res.status(409).json({ success: false, message: 'Transaction already processed' });
    }

    const updated = await prisma.transaction.findUnique({ where: { id } });
    res.json({ success: true, transaction: serializeTransaction(updated) });
  } catch (err) {
    next(err);
  }
}

export async function listBrokers(_req, res, next) {
  try {
    const brokers = await prisma.user.findMany({
      where: { role: 'broker' }, orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, phone: true, email: true, status: true },
    });
    res.json({ success: true, brokers });
  } catch (error) { next(error); }
}

export async function setBrokerSuspension(req, res, next) {
  try {
    const parsed = z.object({ suspended: z.boolean() }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, message: 'suspended must be a boolean' });
    const status = parsed.data.suspended ? 'suspended' : 'active';
    const previous = parsed.data.suspended ? 'active' : 'suspended';
    const changed = await prisma.user.updateMany({
      where: { id: req.params.id, role: 'broker', status: previous }, data: { status },
    });
    if (!changed.count) return res.status(409).json({ success: false, message: `Only ${previous} brokers can transition to ${status}` });
    res.json({ success: true, broker: { id: req.params.id, status } });
  } catch (error) { next(error); }
}

export async function listModerationListings(_req, res, next) {
  try {
    const rows = await prisma.listing.findMany({
      where: { status: { not: 'deleted' } }, orderBy: { createdAt: 'desc' },
      include: { broker: { select: { id: true, name: true, phone: true } } },
    });
    res.json({ success: true, listings: rows.map(serializeListing) });
  } catch (error) { next(error); }
}

export async function moderateListing(req, res, next) {
  try {
    const parsed = z.object({ action: z.enum(['approve', 'reject', 'hide']), reason: z.string().trim().max(500).optional() }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, message: 'Invalid moderation action or reason' });
    const statuses = { approve: 'approved', reject: 'rejected', hide: 'hidden' };
    const updated = await prisma.listing.updateMany({
      where: { id: req.params.id, status: { not: 'deleted' } },
      data: { moderationStatus: statuses[parsed.data.action], moderationReason: parsed.data.action === 'approve' ? null : parsed.data.reason || null },
    });
    if (!updated.count) return res.status(404).json({ success: false, message: 'Listing not found' });
    const row = await prisma.listing.findUnique({ where: { id: req.params.id } });
    res.json({ success: true, listing: serializeListing(row) });
  } catch (error) { next(error); }
}
