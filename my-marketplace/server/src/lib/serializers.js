// Shared shape converters: Prisma camelCase rows → frontend snake_case payloads.

// SQLite has no array type, so listing images are stored as a JSON string.
// Parse defensively — anything malformed becomes an empty array.
export function parseImages(raw) {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function serializeListing(row) {
  if (!row) return null;
  return {
    id: row.id,
    broker_id: row.brokerId,
    broker_name: row.broker?.name,
    broker_phone: row.broker?.phone,
    title: row.title,
    description: row.description,
    property_type: row.propertyType,
    offer_type: row.offerType,
    price: row.price,
    city: row.city,
    area: row.area,
    size_sqm: row.sizeSqm,
    rooms: row.rooms,
    floor: row.floor,
    images: parseImages(row.images),
    ad_license_no: row.adLicenseNo,
    status: row.status,
    moderation_status: row.moderationStatus,
    moderation_reason: row.moderationReason,
    is_active: row.status === 'active' && row.moderationStatus === 'approved',
    views_count: row.viewsCount,
    is_featured: row.isFeatured ?? false,
    feature_type: row.featureType ?? null,
    featured_until: row.featuredUntil ?? null,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

// Compact user shape for chat counterparties — never includes password.
function serializeChatUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
  };
}

export function serializeMessage(row) {
  if (!row) return null;
  return {
    id: row.id,
    conversation_id: row.conversationId,
    sender_id: row.senderId,
    body: row.body,
    read_at: row.readAt ?? null,
    created_at: row.createdAt,
  };
}

// Conversation includes a small listing snippet + counterparty info so the
// chat header has everything it needs in one round-trip.
//
// last_message is populated only when the caller's Prisma query includes
// `messages` (e.g. the inbox endpoint uses { take: 1, orderBy desc }).
// Other endpoints leave it as null — additive and backward-compatible.
export function serializeConversation(row, viewerId) {
  if (!row) return null;
  const counterparty =
    viewerId === row.buyerId ? row.broker : row.buyer;
  const lastMessage =
    Array.isArray(row.messages) && row.messages.length > 0 ? row.messages[0] : null;
  return {
    id: row.id,
    listing_id: row.listingId,
    buyer_id: row.buyerId,
    broker_id: row.brokerId,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    counterparty: serializeChatUser(counterparty),
    listing: row.listing
      ? {
          id: row.listing.id,
          title: row.listing.title,
          city: row.listing.city,
          price: row.listing.price,
          images: parseImages(row.listing.images),
        }
      : null,
    last_message: lastMessage ? serializeMessage(lastMessage) : null,
    unread_count: row._count?.messages ?? 0,
  };
}

// Public-facing broker shape for the /api/brokers/:id endpoint.
// Excludes password, status, rejectionReason — those are admin-only.
export function serializeBrokerPublic(user) {
  if (!user) return null;
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

// Credit-purchase transaction. broker_* fields are populated only when the
// caller's Prisma query includes `broker` (the admin list does; a broker
// reading their own history doesn't need it).
export function serializeTransaction(row) {
  if (!row) return null;
  return {
    id: row.id,
    broker_id: row.brokerId,
    broker_name: row.broker?.name ?? null,
    broker_phone: row.broker?.phone ?? null,
    package: row.packageId,
    amount: row.amount,
    credits: row.credits,
    method: row.method,
    status: row.status,
    sender_number: row.senderNumber ?? null,
    receipt_url: row.receiptUrl ?? null,
    rejection_reason: row.rejectionReason ?? null,
    reviewed_at: row.reviewedAt ?? null,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}
