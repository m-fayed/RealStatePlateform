import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { CREDIT_PACKAGES, PACKAGE_IDS } from '../lib/credits.js';

// Strip password before sending the user back.
function publicUser(user) {
  const { password, ...rest } = user;
  return rest;
}

const purchaseSchema = z.object({
  package: z.enum(PACKAGE_IDS),
});

// POST /api/credits/purchase — broker only.
// Simulated purchase: no payment processing. On success, credits are added.
export async function purchaseCredits(req, res, next) {
  try {
    const parsed = purchaseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: parsed.error.issues.map((i) => i.message).join(', '),
      });
    }
    const pkg = CREDIT_PACKAGES[parsed.data.package];

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { listingCredits: { increment: pkg.credits } },
    });

    return res.json({
      success: true,
      package: parsed.data.package,
      credits_added: pkg.credits,
      price_egp: pkg.price,
      user: publicUser(updated),
    });
  } catch (err) {
    next(err);
  }
}
