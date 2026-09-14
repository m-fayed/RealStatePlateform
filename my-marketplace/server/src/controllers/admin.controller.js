import { z } from 'zod';
import prisma from '../lib/prisma.js';

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

// GET /api/admin/statistics — four counts in parallel.
export async function getStatistics(req, res, next) {
  try {
    const [active_brokers, seekers, total_listings, pending_registrations] = await Promise.all([
      prisma.user.count({ where: { role: 'broker', status: 'active' } }),
      prisma.user.count({ where: { role: 'seeker', status: 'active' } }),
      prisma.listing.count({ where: { status: 'active' } }),
      prisma.user.count({ where: { role: 'broker', status: 'pending' } }),
    ]);

    res.json({
      success: true,
      active_brokers,
      seekers,
      total_listings,
      pending_registrations,
    });
  } catch (err) {
    next(err);
  }
}
