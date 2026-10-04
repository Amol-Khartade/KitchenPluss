import { Router, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import pool from '../db/pool.js';
import {
  authenticateToken,
  requireRole,
  AuthenticatedRequest,
} from '../middleware/auth.js';
import { SafeUser } from '../types/index.js';

const router = Router();

// Require authentication and at least Admin role for all user management endpoints
router.use(authenticateToken);
router.use(requireRole(['Owner', 'Admin']));

const createUserSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  name: z.string().min(1, 'Name is required'),
  role: z.enum([
    'Owner',
    'Admin',
    'Executive Chef',
    'Sous Chef',
    'Line Cook',
    'Station Lead',
    'Kitchen Manager',
    'Server / Front of House',
  ]),
  password: z.string().min(6).optional(),
});

const updateRoleSchema = z.object({
  role: z.enum([
    'Owner',
    'Admin',
    'Executive Chef',
    'Sous Chef',
    'Line Cook',
    'Station Lead',
    'Kitchen Manager',
    'Server / Front of House',
  ]),
});

function mapUserRow(row: any): SafeUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatar_url: row.avatar_url || null,
    auth_provider: row.auth_provider,
    role: row.role,
    organization_id: row.organization_id,
    created_at: row.created_at,
  };
}

// ------------------------------------------------------------------ //
// GET /api/users — List all users in caller's organization
// ------------------------------------------------------------------ //

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orgId = req.user!.organizationId;

    const usersRes = await pool.query(
      `SELECT id, email, name, avatar_url, auth_provider, role, organization_id, created_at
       FROM users
       WHERE organization_id = $1
       ORDER BY 
         CASE 
           WHEN role = 'Owner' THEN 1 
           WHEN role = 'Admin' THEN 2 
           ELSE 3 
         END,
         created_at ASC`,
      [orgId]
    );

    res.json({ users: usersRes.rows.map(mapUserRow) });
  } catch (error: any) {
    console.error('[users/list] Error:', error);
    res.status(500).json({ error: 'Failed to fetch team members', message: error.message });
  }
});

// ------------------------------------------------------------------ //
// POST /api/users — Add a new user to caller's organization
// ------------------------------------------------------------------ //

router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = createUserSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Validation failed', details: parseResult.error.flatten().fieldErrors });
      return;
    }

    const { email, name, role, password } = parseResult.data;
    const orgId = req.user!.organizationId;
    const callerRole = req.user!.role;

    // Only Owner can assign another Owner or Admin
    if ((role === 'Owner' || role === 'Admin') && callerRole !== 'Owner') {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Only the organization Owner can create new Admins or Owners.',
      });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existing = await pool.query('SELECT id, email FROM users WHERE email = $1', [normalizedEmail]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'A user with this email address already exists.' });
      return;
    }

    const rawPassword = password || 'password123';
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const insertRes = await pool.query(
      `INSERT INTO users (email, password_hash, name, role, organization_id, auth_provider)
       VALUES ($1, $2, $3, $4, $5, 'email')
       RETURNING id, email, name, avatar_url, auth_provider, role, organization_id, created_at`,
      [normalizedEmail, hashedPassword, name.trim(), role, orgId]
    );

    const newUser = mapUserRow(insertRes.rows[0]);
    res.status(201).json({ user: newUser, temporaryPassword: rawPassword });
  } catch (error: any) {
    console.error('[users/create] Error:', error);
    res.status(500).json({ error: 'Failed to create user', message: error.message });
  }
});

// ------------------------------------------------------------------ //
// PATCH /api/users/:id/role — Change a team member's role
// ------------------------------------------------------------------ //

router.patch('/:id/role', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = updateRoleSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Invalid role provided' });
      return;
    }

    const targetUserId = req.params['id'];
    const { role: newRole } = parseResult.data;
    const orgId = req.user!.organizationId;
    const callerRole = req.user!.role;
    const callerId = req.user!.userId;

    if (targetUserId === callerId && newRole !== 'Owner' && callerRole === 'Owner') {
      res.status(400).json({ error: 'You cannot demote your own account from Owner.' });
      return;
    }

    // Fetch target user to ensure same organization
    const targetRes = await pool.query('SELECT * FROM users WHERE id = $1 AND organization_id = $2', [
      targetUserId,
      orgId,
    ]);

    if (targetRes.rows.length === 0) {
      res.status(404).json({ error: 'User not found in your organization' });
      return;
    }

    const targetUser = targetRes.rows[0];

    // Restrict modifying Owners or elevating to Admin/Owner
    if (targetUser.role === 'Owner' && callerRole !== 'Owner') {
      res.status(403).json({ error: 'Forbidden', message: 'Only an Owner can modify an Owner account.' });
      return;
    }

    if ((newRole === 'Owner' || newRole === 'Admin') && callerRole !== 'Owner') {
      res.status(403).json({ error: 'Forbidden', message: 'Only an Owner can elevate users to Admin or Owner.' });
      return;
    }

    // Update role
    const updateRes = await pool.query(
      `UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, name, avatar_url, auth_provider, role, organization_id, created_at`,
      [newRole, targetUserId]
    );

    res.json({ user: mapUserRow(updateRes.rows[0]) });
  } catch (error: any) {
    console.error('[users/updateRole] Error:', error);
    res.status(500).json({ error: 'Failed to update user role', message: error.message });
  }
});

// ------------------------------------------------------------------ //
// DELETE /api/users/:id — Remove a user from the organization
// ------------------------------------------------------------------ //

router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetUserId = req.params['id'];
    const orgId = req.user!.organizationId;
    const callerRole = req.user!.role;
    const callerId = req.user!.userId;

    if (targetUserId === callerId) {
      res.status(400).json({ error: 'You cannot remove your own account.' });
      return;
    }

    const targetRes = await pool.query('SELECT * FROM users WHERE id = $1 AND organization_id = $2', [
      targetUserId,
      orgId,
    ]);

    if (targetRes.rows.length === 0) {
      res.status(404).json({ error: 'User not found in your organization' });
      return;
    }

    const targetUser = targetRes.rows[0];

    if (targetUser.role === 'Owner') {
      res.status(403).json({ error: 'Forbidden', message: 'Organization Owner cannot be removed.' });
      return;
    }

    if (targetUser.role === 'Admin' && callerRole !== 'Owner') {
      res.status(403).json({ error: 'Forbidden', message: 'Only the Owner can remove an Admin.' });
      return;
    }

    await pool.query('DELETE FROM users WHERE id = $1', [targetUserId]);

    res.json({ success: true, message: `User ${targetUser.email} removed from organization.` });
  } catch (error: any) {
    console.error('[users/delete] Error:', error);
    res.status(500).json({ error: 'Failed to remove user', message: error.message });
  }
});

export default router;
