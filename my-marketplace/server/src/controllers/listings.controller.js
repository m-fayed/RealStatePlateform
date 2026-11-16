import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { serializeListing } from '../lib/serializers.js';
import { resolveBoost, activeBoostRank } from '../lib/boost.js';
import { spendCredits, InsufficientCreditsError } from '../lib/credits.js';

const PROPERTY_TYPES = [
  'apartment', 'villa', 'duplex', 'penthouse', 'studio',
  'shop', 'office', 'clinic', 'warehouse', 'land',
];
const OFFER_TYPES = ['sale', 'rent'];

const createSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(5000).optional().nullable(),
  property_type: z.enum(PROPERTY_TYPES),
  offer_type: z.enum(OFFER_TYPES),
  price: z.coerce.number().positive(),
  city: z.string().trim().min(1),
  area: z.string().trim().optional().nullable(),
  size_sqm: z.coerce.number().positive().optional().nullable(),
  rooms: z.coerce.number().int().nonnegative().optional().nullable(),
  floor: z.coerce.number().int().optional().nullable(),
  images: z.array(z.string().url()).max(10).default([]),
  ad_license_no: z.string().trim().min(1).optional(),
});

const updateSchema = createSchema.partial().extend({ images: z.array(z.string().url()).max(10).optional() });

function formatZodError(err) {
  return err.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join(', ');
}

// GET /api/listings — public, with filters.
export async function listListings(req, res, next) {
  try {
    const {
      city,
      property_type,
      offer_type,
      min_price,
      max_price,
      q,
      broker_id,
      sort = 'newest',
    } = req.query;

    const where = { status: 'active', moderationStatus: 'approved', broker: { status: 'active' } };
    if (city) where.city = String(city);
    if (property_type) where.propertyType = String(property_type);
    if (offer_type) where.offerType = String(offer_type);
    if (broker_id) where.brokerId = String(broker_id);
    if (min_price || max_price) {
      where.price = {};
      if (min_price) where.price.gte = Number(min_price);
      if (max_price) where.price.lte = Number(max_price);
    }
    if (q) {
      const term = String(q);
      where.OR = [
        { title: { contains: term } },
        { description: { contains: term } },
        { area: { contains: term } },
      ];
    }

    const orderBy =
      sort === 'price_asc' ? { price: 'asc' } :
      sort === 'price_desc' ? { price: 'desc' } :
      sort === 'oldest' ? { createdAt: 'asc' } :
      { createdAt: 'desc' };

    const rows = await prisma.listing.findMany({
      where,
      orderBy,
      include: { broker: { select: { id: true, name: true, phone: true } } },
      take: 100,
    });

    // Stable secondary sort: keep Prisma's order within each boost tier.
    // Tiers: premium (3) > top (2) > badge (1) > normal/expired (0).
    const now = new Date();
    rows.sort((a, b) => activeBoostRank(b, now) - activeBoostRank(a, now));

    res.json({ success: true, listings: rows.map(serializeListing) });
  } catch (err) {
    next(err);
  }
}

// GET /api/listings/:id — public, increments views.
export async function getListing(req, res, next) {
  try {
    const { id } = req.params;
    const row = await prisma.listing.findFirst({
      where: { id, status: { not: 'deleted' }, moderationStatus: 'approved', broker: { status: 'active' } },
      include: { broker: { select: { id: true, name: true, phone: true } } },
    });
    if (!row || row.status === 'deleted') {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }

    // Atomic increment — safe under concurrent reads.
    const updated = await prisma.listing.update({
      where: { id },
      data: { viewsCount: { increment: 1 } },
      include: { broker: { select: { id: true, name: true, phone: true } } },
    });

    res.json({ success: true, listing: serializeListing(updated) });
  } catch (err) {
    next(err);
  }
}

// POST /api/listings — broker only.
export async function createListing(req, res, next) {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: formatZodError(parsed.error) });
    }
    const data = parsed.data;

    // The frontend doesn't ask for ad_license_no — fall back to the broker's stored one.
    const adLicenseNo = data.ad_license_no || req.user.adLicense;
    if (!adLicenseNo) {
      return res.status(400).json({
        success: false,
        message: 'No ad_license_no provided and broker has no license on file',
      });
    }

    // Conditional debit and listing creation commit or roll back together.
    const { created, creditsRemaining } = await prisma.$transaction(async (tx) => {
      const creditsRemaining = await spendCredits(tx, req.user.id, 1);
      const created = await tx.listing.create({
        data: {
          brokerId: req.user.id,
          title: data.title,
          description: data.description ?? null,
          propertyType: data.property_type,
          offerType: data.offer_type,
          price: data.price,
          city: data.city,
          area: data.area ?? null,
          sizeSqm: data.size_sqm ?? null,
          rooms: data.rooms ?? null,
          floor: data.floor ?? null,
          images: JSON.stringify(data.images || []),
          adLicenseNo,
        },
        include: { broker: { select: { id: true, name: true, phone: true } } },
      });
      return { created, creditsRemaining };
    });

    res.status(201).json({
      success: true,
      listing: serializeListing(created),
      credits_remaining: creditsRemaining,
    });
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return res.status(402).json({ success: false, code: err.code, message: err.message });
    }
    next(err);
  }
}

// PUT /api/listings/:id — owner broker only.
export async function updateListing(req, res, next) {
  try {
    const { id } = req.params;
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: formatZodError(parsed.error) });
    }

    const existing = await prisma.listing.findUnique({ where: { id } });
    if (!existing || existing.status === 'deleted') {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }
    if (existing.brokerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You do not own this listing' });
    }

    const d = parsed.data;
    const data = {};
    if (d.title !== undefined) data.title = d.title;
    if (d.description !== undefined) data.description = d.description;
    if (d.property_type !== undefined) data.propertyType = d.property_type;
    if (d.offer_type !== undefined) data.offerType = d.offer_type;
    if (d.offer_type && d.offer_type !== existing.offerType && ['sold', 'rented'].includes(existing.status)) data.status = 'active';
    if (d.price !== undefined) data.price = d.price;
    if (d.city !== undefined) data.city = d.city;
    if (d.area !== undefined) data.area = d.area;
    if (d.size_sqm !== undefined) data.sizeSqm = d.size_sqm;
    if (d.rooms !== undefined) data.rooms = d.rooms;
    if (d.floor !== undefined) data.floor = d.floor;
    if (d.images !== undefined) data.images = JSON.stringify(d.images);
    if (d.ad_license_no !== undefined) data.adLicenseNo = d.ad_license_no;
    // Changes must be reviewed again and cannot undo a moderator's hidden state.
    data.moderationStatus = existing.moderationStatus === 'hidden' ? 'hidden' : 'pending';

    const updated = await prisma.listing.update({
      where: { id },
      data,
      include: { broker: { select: { id: true, name: true, phone: true } } },
    });

    res.json({ success: true, listing: serializeListing(updated) });
  } catch (err) {
    next(err);
  }
}

// GET /api/listings/mine — includes pending, hidden, sold and rented listings.
export async function listMyListings(req, res, next) {
  try {
    const rows = await prisma.listing.findMany({
      where: { brokerId: req.user.id, status: { not: 'deleted' } },
      orderBy: { createdAt: 'desc' },
      include: { broker: { select: { id: true, name: true, phone: true } } },
    });
    res.json({ success: true, listings: rows.map(serializeListing) });
  } catch (error) { next(error); }
}

export async function changeListingStatus(req, res, next) {
  try {
    const parsed = z.object({ status: z.enum(['active', 'sold', 'rented']) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, message: 'Invalid listing status' });
    const listing = await prisma.listing.findUnique({ where: { id: req.params.id } });
    if (!listing || listing.status === 'deleted') return res.status(404).json({ success: false, message: 'Listing not found' });
    if (listing.brokerId !== req.user.id) return res.status(403).json({ success: false, message: 'You do not own this listing' });
    if ((parsed.data.status === 'sold' && listing.offerType !== 'sale') || (parsed.data.status === 'rented' && listing.offerType !== 'rent')) {
      return res.status(400).json({ success: false, message: 'Status does not match the offer type' });
    }
    const updated = await prisma.listing.update({ where: { id: listing.id }, data: { status: parsed.data.status } });
    res.json({ success: true, listing: serializeListing(updated) });
  } catch (error) { next(error); }
}

// POST /api/listings/:id/boost — owner broker only.
// Deducts credits and activates the chosen boost. Re-boosting overwrites the
// active boost (featuredUntil resets to now + duration).
const boostSchema = z.object({
  type: z.enum(['top', 'badge', 'premium']),
  duration_days: z.coerce.number().int().optional(),
});

export async function boostListing(req, res, next) {
  try {
    const { id } = req.params;
    const parsed = boostSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: formatZodError(parsed.error) });
    }

    const option = resolveBoost(parsed.data.type, parsed.data.duration_days);
    if (!option) {
      return res.status(400).json({
        success: false,
        message: 'Invalid boost type or duration. Top requires duration_days of 3 or 7.',
      });
    }

    const existing = await prisma.listing.findUnique({ where: { id } });
    if (!existing || existing.status === 'deleted') {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }
    if (existing.brokerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You do not own this listing' });
    }

    const featuredUntil = new Date(Date.now() + option.durationDays * 24 * 60 * 60 * 1000);

    const { updated, creditsRemaining } = await prisma.$transaction(async (tx) => {
      const creditsRemaining = await spendCredits(tx, req.user.id, option.cost);
      const updated = await tx.listing.update({
        where: { id },
        data: {
          isFeatured: true,
          featureType: option.type,
          featuredUntil,
        },
        include: { broker: { select: { id: true, name: true, phone: true } } },
      });
      return { updated, creditsRemaining };
    });

    res.json({
      success: true,
      listing: serializeListing(updated),
      boost: {
        type: option.type,
        duration_days: option.durationDays,
        cost: option.cost,
      },
      credits_remaining: creditsRemaining,
    });
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return res.status(402).json({ success: false, code: err.code, message: err.message });
    }
    next(err);
  }
}

// DELETE /api/listings/:id — owner broker only. Soft delete.
export async function deleteListing(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await prisma.listing.findUnique({ where: { id } });
    if (!existing || existing.status === 'deleted') {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }
    if (existing.brokerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You do not own this listing' });
    }

    await prisma.listing.update({ where: { id }, data: { status: 'deleted' } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
