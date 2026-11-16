import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import process from 'node:process';
import { claimLicense, fileUrl, uploadFilename } from '../lib/uploads.js';

const TOKEN_TTL = '7d';

function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  );
}

// Strip password and other sensitive fields before sending a user to the client.
function publicUser(user) {
  const rest = { ...user };
  delete rest.password;
  return rest;
}

const phoneSchema = z
  .string()
  .trim()
  .min(7, 'Phone is too short')
  .max(20, 'Phone is too long');

const passwordSchema = z.string().min(8, 'Password must be at least 8 characters').max(72);

const seekerSchema = z.object({
  name: z.string().trim().min(2),
  phone: phoneSchema,
  email: z.string().email().optional().or(z.literal('').transform(() => undefined)),
  password: passwordSchema,
});

const brokerSchema = z.object({
  name: z.string().trim().min(2),
  phone: phoneSchema,
  email: z.string().email(),
  password: passwordSchema,
  license_image_url: z.string().url(),
  license_upload_token: z.string().min(1),
  ad_license_no: z.string().trim().min(1),
});

const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1),
});

function formatZodError(err) {
  return err.issues.map((i) => i.message).join(', ');
}

export async function registerSeeker(req, res, next) {
  try {
    const parsed = seekerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: formatZodError(parsed.error) });
    }
    const { name, phone, email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Phone already registered' });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        phone,
        email: email || null,
        password: hash,
        role: 'seeker',
        status: 'active',
      },
    });

    const token = signToken(user);
    return res.status(201).json({ success: true, user: publicUser(user), token });
  } catch (err) {
    next(err);
  }
}

export async function registerBroker(req, res, next) {
  try {
    const parsed = brokerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: formatZodError(parsed.error) });
    }
    const { name, phone, email, password, license_image_url, license_upload_token, ad_license_no } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Phone already registered' });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await claimLicense(license_image_url, license_upload_token, () => prisma.user.create({
      data: {
        name,
        phone,
        email,
        password: hash,
        role: 'broker',
        status: 'pending',
        licenseImageUrl: fileUrl(req, uploadFilename(license_image_url), true),
        adLicense: ad_license_no,
      },
    }));

    // No token yet — broker can't log in until admin approves.
    return res.status(201).json({
      success: true,
      message: 'Registration submitted. An admin will review your license shortly.',
      user: publicUser(user),
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: formatZodError(parsed.error) });
    }
    const { phone, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid phone or password' });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Invalid phone or password' });
    }

    if (user.status === 'pending') {
      return res.status(403).json({ success: false, message: 'Account is pending admin review' });
    }
    if (user.status === 'rejected') {
      return res.status(403).json({
        success: false,
        message: user.rejectionReason
          ? `Account was rejected: ${user.rejectionReason}`
          : 'Account was rejected',
      });
    }
    if (user.status === 'suspended') {
      return res.status(403).json({ success: false, message: 'Account is suspended' });
    }

    const token = signToken(user);
    return res.json({ success: true, user: publicUser(user), token });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/me — handy for the frontend to refresh user state.
export async function me(req, res) {
  return res.json({ success: true, user: publicUser(req.user) });
}

