import prisma from '../lib/prisma.js';
import { serializeBrokerPublic, serializeListing } from '../lib/serializers.js';

// GET /api/brokers/:id — public broker profile + active listings.
// Only active brokers are visible; pending/rejected/suspended → 404.
export async function getBrokerProfile(req, res, next) {
  try {
    const { id } = req.params;

    const broker = await prisma.user.findFirst({
      where: { id, role: 'broker', status: 'active' },
    });
    if (!broker) {
      return res.status(404).json({ success: false, message: 'Broker not found' });
    }

    const listings = await prisma.listing.findMany({
      where: { brokerId: id, status: 'active' },
      orderBy: { createdAt: 'desc' },
      include: { broker: { select: { id: true, name: true, phone: true } } },
    });

    const serialized = listings.map(serializeListing);

    res.json({
      success: true,
      broker: {
        ...serializeBrokerPublic(broker),
        active_listings_count: serialized.length,
        listings: serialized,
      },
    });
  } catch (err) {
    next(err);
  }
}
