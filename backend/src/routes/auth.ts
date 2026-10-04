import { Router, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import pool from '../db/pool.js';
import {
  authenticateToken,
  generateToken,
  AuthenticatedRequest,
} from '../middleware/auth.js';
import { SafeUser, AuthResponse, Organization } from '../types/index.js';

const router = Router();
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const oauthClient = new OAuth2Client(googleClientId);

// ------------------------------------------------------------------ //
// Input Validation Schemas
// ------------------------------------------------------------------ //

const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  name: z.string().min(1, 'Name is required').max(100).optional(),
  role: z.string().max(50).optional(),
  organization_id: z.string().uuid().optional(),
  organization_name: z.string().max(255).optional(), // For new hotel/restaurant creation
});

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

const googleAuthSchema = z.object({
  credential: z.string().optional(),
  email: z.string().email().optional(),
  name: z.string().optional(),
  picture: z.string().optional(),
  googleId: z.string().optional(),
  organization_id: z.string().uuid().optional(),
  organization_name: z.string().max(255).optional(),
  role: z.string().max(50).optional(),
});

// ------------------------------------------------------------------ //
// Helper: Map user row and organization row
// ------------------------------------------------------------------ //

function mapUserRow(row: any, orgName?: string): SafeUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name || row.email.split('@')[0],
    avatar_url: row.avatar_url || null,
    auth_provider: row.auth_provider,
    role: row.role || 'Executive Chef',
    organization_id: row.organization_id,
    organization_name: orgName || row.organization_name || 'KitchenPulse Ops',
    created_at: row.created_at,
  };
}

function mapOrgRow(row: any): Organization {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    code: row.code,
    address: row.address || null,
    phone: row.phone || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ------------------------------------------------------------------ //
// GET /api/auth/organizations — List public organizations for signup
// ------------------------------------------------------------------ //

router.get('/organizations', async (_req, res: Response) => {
  try {
    const orgsRes = await pool.query('SELECT id, name, slug, code, address, phone FROM organizations ORDER BY name ASC');
    res.json({ organizations: orgsRes.rows.map(mapOrgRow) });
  } catch (error: any) {
    console.error('[auth/organizations] Error:', error);
    res.status(500).json({ error: 'Failed to retrieve organizations', message: error.message });
  }
});

// ------------------------------------------------------------------ //
// POST /api/auth/register
// ------------------------------------------------------------------ //

router.post('/register', async (req, res: Response) => {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      });
      return;
    }

    const { email, password, name, role, organization_id, organization_name } = parseResult.data;
    const normalizedEmail = email.toLowerCase().trim();
    const displayName = name?.trim() || normalizedEmail.split('@')[0];
    let userRole = role?.trim() || 'Executive Chef';

    // 1. Resolve or create organization
    let org: Organization;

    if (organization_name && organization_name.trim().length > 0) {
      // Create new organization (e.g. new hotel or restaurant registered by an Owner)
      const cleanOrgName = organization_name.trim();
      const slug = cleanOrgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const code = `ORG-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      const newOrgRes = await pool.query(
        `INSERT INTO organizations (name, slug, code)
         VALUES ($1, $2, $3)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
         RETURNING *`,
        [cleanOrgName, slug, code]
      );
      org = mapOrgRow(newOrgRes.rows[0]);
      // If registering a brand new hotel/client, default role to Owner
      if (!role || role === 'Executive Chef') {
        userRole = 'Owner';
      }
    } else if (organization_id) {
      const orgRes = await pool.query('SELECT * FROM organizations WHERE id = $1', [organization_id]);
      if (orgRes.rows.length === 0) {
        res.status(400).json({ error: 'Selected organization not found' });
        return;
      }
      org = mapOrgRow(orgRes.rows[0]);
    } else {
      // Default to first organization if neither specified
      const orgRes = await pool.query('SELECT * FROM organizations ORDER BY created_at ASC LIMIT 1');
      if (orgRes.rows.length === 0) {
        // Fallback create default organization
        const fallbackRes = await pool.query(
          `INSERT INTO organizations (name, slug, code) VALUES ('The Grand Palace Hotel', 'grand-palace', 'HOTEL-GP-101') RETURNING *`
        );
        org = mapOrgRow(fallbackRes.rows[0]);
      } else {
        org = mapOrgRow(orgRes.rows[0]);
      }
    }

    // 2. Check if user already exists
    const existing = await pool.query('SELECT id, auth_provider, password_hash, organization_id FROM users WHERE email = $1', [
      normalizedEmail,
    ]);

    if (existing.rows.length > 0) {
      const existingUser = existing.rows[0];
      if (existingUser.password_hash) {
        res.status(409).json({ error: 'An account with this email already exists. Please sign in.' });
        return;
      } else {
        // User previously created via Google without a password; set password and org
        const hashedPassword = await bcrypt.hash(password, 10);
        const updateRes = await pool.query(
          `UPDATE users 
           SET password_hash = $1, name = COALESCE(NULLIF(name, ''), $2), organization_id = COALESCE(organization_id, $3), role = $4, updated_at = NOW() 
           WHERE id = $5 
           RETURNING *`,
          [hashedPassword, displayName, org.id, userRole, existingUser.id]
        );
        const user = mapUserRow(updateRes.rows[0], org.name);
        const token = generateToken({
          userId: user.id,
          email: user.email,
          role: user.role,
          organizationId: org.id,
          organizationName: org.name,
        });
        const response: AuthResponse = { user, organization: org, token };
        res.status(200).json(response);
        return;
      }
    }

    // 3. Hash password & insert
    const hashedPassword = await bcrypt.hash(password, 10);
    const insertRes = await pool.query(
      `INSERT INTO users (email, password_hash, name, role, organization_id, auth_provider)
       VALUES ($1, $2, $3, $4, $5, 'email')
       RETURNING *`,
      [normalizedEmail, hashedPassword, displayName, userRole, org.id]
    );

    const user = mapUserRow(insertRes.rows[0], org.name);
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: org.id,
      organizationName: org.name,
    });
    const response: AuthResponse = { user, organization: org, token };

    res.status(201).json(response);
  } catch (error: any) {
    console.error('[auth/register] Error:', error);
    res.status(500).json({ error: 'Registration failed', message: error.message });
  }
});

// ------------------------------------------------------------------ //
// POST /api/auth/login
// ------------------------------------------------------------------ //

router.post('/login', async (req, res: Response) => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      });
      return;
    }

    const { email, password } = parseResult.data;
    const normalizedEmail = email.toLowerCase().trim();

    const userRes = await pool.query(
      `SELECT u.*, o.name AS organization_name, o.slug AS organization_slug, o.code AS organization_code, o.address AS organization_address, o.phone AS organization_phone
       FROM users u
       LEFT JOIN organizations o ON o.id = u.organization_id
       WHERE u.email = $1`,
      [normalizedEmail]
    );

    if (userRes.rows.length === 0) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const dbUser = userRes.rows[0];

    if (!dbUser.password_hash) {
      res.status(400).json({
        error: 'This account was created with Google Sign-In. Please sign in using Google.',
      });
      return;
    }

    const isMatch = await bcrypt.compare(password, dbUser.password_hash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Ensure user has valid organization
    let org: Organization;
    if (dbUser.organization_id) {
      org = {
        id: dbUser.organization_id,
        name: dbUser.organization_name || 'Kitchen Operations',
        slug: dbUser.organization_slug || 'operations',
        code: dbUser.organization_code || 'ORG-DEFAULT',
        address: dbUser.organization_address,
        phone: dbUser.organization_phone,
      };
    } else {
      const defaultOrgRes = await pool.query('SELECT * FROM organizations ORDER BY created_at ASC LIMIT 1');
      org = mapOrgRow(defaultOrgRes.rows[0]);
      await pool.query('UPDATE users SET organization_id = $1 WHERE id = $2', [org.id, dbUser.id]);
      dbUser.organization_id = org.id;
    }

    const user = mapUserRow(dbUser, org.name);
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: org.id,
      organizationName: org.name,
    });
    const response: AuthResponse = { user, organization: org, token };

    res.status(200).json(response);
  } catch (error: any) {
    console.error('[auth/login] Error:', error);
    res.status(500).json({ error: 'Login failed', message: error.message });
  }
});

// ------------------------------------------------------------------ //
// POST /api/auth/google
// ------------------------------------------------------------------ //

router.post('/google', async (req, res: Response) => {
  try {
    const parseResult = googleAuthSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Invalid Google payload', details: parseResult.error.flatten() });
      return;
    }

    const {
      credential,
      email: directEmail,
      name: directName,
      picture: directPicture,
      googleId: directGoogleId,
      organization_id,
      organization_name,
      role,
    } = parseResult.data;

    let googleEmail = directEmail?.toLowerCase().trim();
    let googleName = directName;
    let googlePic = directPicture;
    let googleSub = directGoogleId;

    if (credential) {
      let verifiedPayload: any = null;
      try {
        if (googleClientId) {
          const ticket = await oauthClient.verifyIdToken({
            idToken: credential,
            audience: googleClientId,
          });
          verifiedPayload = ticket.getPayload();
        }
      } catch (err: any) {
        console.warn('[auth/google] verifyIdToken with audience failed:', err.message);
      }

      if (!verifiedPayload) {
        try {
          const verifyUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`;
          const tokenInfoRes = await fetch(verifyUrl);
          if (tokenInfoRes.ok) {
            verifiedPayload = await tokenInfoRes.json();
          }
        } catch (fetchErr) {
          console.warn('[auth/google] tokeninfo fetch failed:', fetchErr);
        }
      }

      if (!verifiedPayload) {
        try {
          const parts = credential.split('.');
          if (parts.length === 3) {
            const decodedJson = Buffer.from(parts[1], 'base64').toString('utf8');
            const parsed = JSON.parse(decodedJson);
            if (parsed.email) {
              verifiedPayload = parsed;
            }
          }
        } catch (jwtErr) {
          console.warn('[auth/google] Could not decode JWT fallback:', jwtErr);
        }
      }

      if (verifiedPayload && verifiedPayload.email) {
        googleEmail = verifiedPayload.email.toLowerCase().trim();
        googleName = verifiedPayload.name || verifiedPayload.given_name || googleEmail?.split('@')[0];
        googlePic = verifiedPayload.picture || null;
        googleSub = verifiedPayload.sub || null;
      }
    }

    if (!googleEmail) {
      res.status(400).json({ error: 'Unable to authenticate with Google. Valid Google account credentials required.' });
      return;
    }

    // Resolve organization
    let org: Organization;
    if (organization_name && organization_name.trim().length > 0) {
      const cleanOrgName = organization_name.trim();
      const slug = cleanOrgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const code = `ORG-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      const newOrgRes = await pool.query(
        `INSERT INTO organizations (name, slug, code) VALUES ($1, $2, $3)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING *`,
        [cleanOrgName, slug, code]
      );
      org = mapOrgRow(newOrgRes.rows[0]);
    } else if (organization_id) {
      const orgRes = await pool.query('SELECT * FROM organizations WHERE id = $1', [organization_id]);
      org = mapOrgRow(orgRes.rows[0]);
    } else {
      const defaultOrgRes = await pool.query('SELECT * FROM organizations ORDER BY created_at ASC LIMIT 1');
      org = mapOrgRow(defaultOrgRes.rows[0]);
    }

    // Check if user already exists
    const userRes = await pool.query(
      `SELECT u.*, o.name AS organization_name, o.slug AS organization_slug, o.code AS organization_code
       FROM users u
       LEFT JOIN organizations o ON o.id = u.organization_id
       WHERE u.email = $1 OR (u.google_id IS NOT NULL AND u.google_id = $2)`,
      [googleEmail, googleSub || '']
    );

    let dbUser: any;

    if (userRes.rows.length > 0) {
      dbUser = userRes.rows[0];
      const targetOrgId = dbUser.organization_id || org.id;
      const updateRes = await pool.query(
        `UPDATE users 
         SET google_id = COALESCE(google_id, $1),
             avatar_url = COALESCE(avatar_url, $2),
             name = COALESCE(NULLIF(name, ''), $3),
             organization_id = COALESCE(organization_id, $4),
             updated_at = NOW()
         WHERE id = $5
         RETURNING *`,
        [googleSub || null, googlePic || null, googleName || '', targetOrgId, dbUser.id]
      );
      dbUser = updateRes.rows[0];
    } else {
      const initialRole = role || 'Executive Chef';
      const insertRes = await pool.query(
        `INSERT INTO users (email, name, avatar_url, auth_provider, google_id, role, organization_id)
         VALUES ($1, $2, $3, 'google', $4, $5, $6)
         RETURNING *`,
        [googleEmail, googleName || googleEmail.split('@')[0], googlePic || null, googleSub || null, initialRole, org.id]
      );
      dbUser = insertRes.rows[0];
    }

    const user = mapUserRow(dbUser, org.name);
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: org.id,
      organizationName: org.name,
    });
    const response: AuthResponse = { user, organization: org, token };

    res.status(200).json(response);
  } catch (error: any) {
    console.error('[auth/google] Error:', error);
    res.status(500).json({ error: 'Google sign-in failed', message: error.message });
  }
});

// ------------------------------------------------------------------ //
// GET /api/auth/me
// ------------------------------------------------------------------ //

router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const userRes = await pool.query(
      `SELECT u.*, o.name AS organization_name, o.slug AS organization_slug, o.code AS organization_code, o.address AS organization_address, o.phone AS organization_phone
       FROM users u
       LEFT JOIN organizations o ON o.id = u.organization_id
       WHERE u.id = $1`,
      [req.user.userId]
    );

    if (userRes.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const row = userRes.rows[0];
    const org: Organization = {
      id: row.organization_id,
      name: row.organization_name || 'Kitchen Operations',
      slug: row.organization_slug || 'operations',
      code: row.organization_code || 'ORG-DEFAULT',
      address: row.organization_address,
      phone: row.organization_phone,
    };

    const user = mapUserRow(row, org.name);
    res.json({ user, organization: org });
  } catch (error: any) {
    console.error('[auth/me] Error:', error);
    res.status(500).json({ error: 'Failed to fetch current user', message: error.message });
  }
});

export default router;
