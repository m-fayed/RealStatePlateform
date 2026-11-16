import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { serializeConversation, serializeMessage } from '../lib/serializers.js';

const createSchema = z.object({
  listing_id: z.string().min(1),
});

const messageSchema = z.object({
  body: z.string().trim().min(1).max(4000),
});

function formatZodError(err) {
  return err.issues.map((i) => i.message).join(', ');
}

// Loads conversation and asserts the caller is a participant.
// Returns the conversation row (with listing + buyer + broker) or null on 404,
// or false when the caller has no access.
async function loadParticipantConversation(id, userId) {
  const row = await prisma.conversation.findUnique({
    where: { id },
    include: {
      listing: true,
      buyer: true,
      broker: true,
    },
  });
  if (!row) return null;
  if (row.buyerId !== userId && row.brokerId !== userId) return false;
  return row;
}

// GET /api/conversations — list all conversations the caller participates in,
// ordered by most recent activity. Latest message is included for inbox preview.
export async function listMyConversations(req, res, next) {
  try {
    const rows = await prisma.conversation.findMany({
      where: {
        OR: [{ buyerId: req.user.id }, { brokerId: req.user.id }],
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        listing: true,
        buyer: true,
        broker: true,
        messages: { take: 1, orderBy: { createdAt: 'desc' } },
      },
      take: 100,
    });

    res.json({
      success: true,
      conversations: rows.map((r) => serializeConversation(r, req.user.id)),
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/conversations — body: { listing_id }. Idempotent.
// If a conversation between this caller (as buyer) and the listing already
// exists, it's returned. Otherwise we create one.
export async function createOrFetchConversation(req, res, next) {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: formatZodError(parsed.error) });
    }
    const { listing_id } = parsed.data;

    const listing = await prisma.listing.findUnique({ where: { id: listing_id } });
    if (!listing || listing.status === 'deleted') {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }
    if (listing.brokerId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot start a conversation on your own listing',
      });
    }

    // Try fetch first — the most common path once the buyer has chatted before.
    const existing = await prisma.conversation.findUnique({
      where: { listingId_buyerId: { listingId: listing.id, buyerId: req.user.id } },
      include: { listing: true, buyer: true, broker: true },
    });
    if (existing) {
      return res.json({ success: true, conversation: serializeConversation(existing, req.user.id) });
    }

    const created = await prisma.conversation.create({
      data: {
        listingId: listing.id,
        buyerId: req.user.id,
        brokerId: listing.brokerId,
      },
      include: { listing: true, buyer: true, broker: true },
    });
    return res.status(201).json({
      success: true,
      conversation: serializeConversation(created, req.user.id),
    });
  } catch (err) {
    // Race: two simultaneous creates. Re-fetch and return the existing one.
    if (err?.code === 'P2002') {
      const existing = await prisma.conversation.findUnique({
        where: { listingId_buyerId: { listingId: req.body.listing_id, buyerId: req.user.id } },
        include: { listing: true, buyer: true, broker: true },
      });
      if (existing) {
        return res.json({ success: true, conversation: serializeConversation(existing, req.user.id) });
      }
    }
    next(err);
  }
}

// GET /api/conversations/:id — metadata for the chat header.
export async function getConversation(req, res, next) {
  try {
    const row = await loadParticipantConversation(req.params.id, req.user.id);
    if (row === null) return res.status(404).json({ success: false, message: 'Conversation not found' });
    if (row === false) return res.status(403).json({ success: false, message: 'Forbidden' });

    res.json({ success: true, conversation: serializeConversation(row, req.user.id) });
  } catch (err) {
    next(err);
  }
}

// GET /api/conversations/:id/messages — ordered ascending (oldest first).
export async function listMessages(req, res, next) {
  try {
    const row = await loadParticipantConversation(req.params.id, req.user.id);
    if (row === null) return res.status(404).json({ success: false, message: 'Conversation not found' });
    if (row === false) return res.status(403).json({ success: false, message: 'Forbidden' });

    const messages = await prisma.message.findMany({
      where: { conversationId: row.id },
      orderBy: { createdAt: 'asc' },
      take: 500, // hard cap; pagination can be added later if needed
    });
    res.json({ success: true, messages: messages.map(serializeMessage) });
  } catch (err) {
    next(err);
  }
}

// POST /api/conversations/:id/messages — body: { body }
export async function postMessage(req, res, next) {
  try {
    const parsed = messageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: formatZodError(parsed.error) });
    }
    const row = await loadParticipantConversation(req.params.id, req.user.id);
    if (row === null) return res.status(404).json({ success: false, message: 'Conversation not found' });
    if (row === false) return res.status(403).json({ success: false, message: 'Forbidden' });

    // Bump the conversation's updatedAt in the same write so inbox sorts work.
    const [, message] = await prisma.$transaction([
      prisma.conversation.update({ where: { id: row.id }, data: { updatedAt: new Date() } }),
      prisma.message.create({
        data: {
          conversationId: row.id,
          senderId: req.user.id,
          body: parsed.data.body,
        },
      }),
    ]);
    res.status(201).json({ success: true, message: serializeMessage(message) });
  } catch (err) {
    next(err);
  }
}
