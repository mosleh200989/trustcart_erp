import { HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { Customer } from '../customers/customer.entity';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { UserSessionsService } from '../user-sessions/user-sessions.service';
import { LoginAttemptsService, LoginResult } from '../user-sessions/login-attempts.service';
import { requireJwtSecret } from '../../common/jwt-secret';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Customer)
    private customersRepository: Repository<Customer>,
    private userSessions: UserSessionsService,
    private loginAttempts: LoginAttemptsService,
  ) {}

  /**
   * Sign a token and record the login as a session, so the device shows up in
   * the admin session list and can be signed out again.
   *
   * The session key travels in the `sid` claim. If the session row could not be
   * written the token is still issued without a `sid` — a login must not fail
   * over bookkeeping — and validateJwtPayload treats such a token as legacy.
   */
  private async issueToken(
    payload: Record<string, any>,
    session: {
      subjectType: 'user' | 'customer';
      userId?: number | null;
      customerId?: number | null;
      roleId?: number | null;
    },
    request?: any,
  ): Promise<string> {
    const sessionKey = await this.userSessions.createSession({ ...session, request });

    return jwt.sign(
      sessionKey ? { ...payload, sid: sessionKey } : payload,
      requireJwtSecret(),
      { expiresIn: '24h' },
    );
  }

  /** Sign the caller's own device out; the token stops working immediately. */
  async logout(sessionKey?: string | null) {
    if (!sessionKey) return { success: true, revoked: 0 };
    const result = await this.userSessions.revokeByKey(String(sessionKey), 'logout');
    return { success: true, revoked: result.revoked };
  }

  /**
   * Normalize phone number to support both formats:
   * - With +88 prefix: +8801712345678
   * - Without prefix: 01712345678
   * Returns both variants to search in database
   */
  private normalizePhoneForLogin(phone: string): string[] {
    const cleaned = phone.replace(/[\s\-\(\)]/g, ''); // Remove spaces, dashes, parentheses
    const variants: string[] = [];
    
    if (cleaned.startsWith('+88')) {
      // Input has +88 prefix
      variants.push(cleaned); // +8801712345678
      variants.push(cleaned.slice(3)); // 01712345678
    } else if (cleaned.startsWith('88') && cleaned.length > 10) {
      // Input has 88 prefix without +
      variants.push('+' + cleaned); // +8801712345678
      variants.push(cleaned.slice(2)); // 01712345678
    } else if (cleaned.startsWith('0')) {
      // Input starts with 0 (local format)
      variants.push(cleaned); // 01712345678
      variants.push('+88' + cleaned); // +8801712345678
    } else {
      // Input is raw digits without any prefix (e.g., 1712345678)
      variants.push(cleaned);
      variants.push('0' + cleaned); // 01712345678
      variants.push('+88' + cleaned); // +881712345678
      variants.push('+880' + cleaned); // +8801712345678
    }
    
    return [...new Set(variants)]; // Remove duplicates
  }

  /**
   * Tag a credential failure so the wrapper below can record *why* it failed
   * without the caller ever learning the difference — every one of these still
   * reaches the client as a flat "Invalid credentials".
   */
  private credentialError(result: LoginResult, message = 'Invalid credentials') {
    const error: any = new UnauthorizedException(message);
    error.loginResult = result;
    return error;
  }

  /**
   * Rate limiting and the attempt record wrap the real login, so every exit —
   * unknown account, wrong password, inactive, success — is counted exactly
   * once, whichever of the identity paths inside took it.
   */
  async login(identifier: string, password: string, request?: any) {
    const decision = await this.loginAttempts.check(identifier, request);
    if (decision.blocked) {
      throw new HttpException(
        { statusCode: 429, message: this.loginAttempts.message(decision), code: 'LOGIN_THROTTLED' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    try {
      const outcome = await this.performLogin(identifier, password, request);
      await this.loginAttempts.record({
        identifier,
        result: 'success',
        request,
        userId: outcome?.user?.roleSlug === 'customer-account' ? null : Number(outcome?.user?.id) || null,
        subjectType: outcome?.user?.roleSlug === 'customer-account' ? 'customer' : 'user',
      });
      return outcome;
    } catch (error: any) {
      await this.loginAttempts.record({
        identifier,
        result: (error?.loginResult as LoginResult) || 'invalid_password',
        request,
      });
      throw error;
    }
  }

  private async performLogin(identifier: string, password: string, request?: any) {
    const loginValue = (identifier || '').toString().trim();
    if (!loginValue) {
      throw this.credentialError('unknown_account');
    }

    const looksLikeEmail = loginValue.includes('@');
    
    // Get phone variants for searching
    const phoneVariants = !looksLikeEmail ? this.normalizePhoneForLogin(loginValue) : [];

    // First, try to find in users table
    let user = null;
    if (looksLikeEmail) {
      user = await this.usersRepository.findOne({ where: { email: loginValue, isDeleted: false } });
    } else {
      // Try all phone variants
      for (const phoneVariant of phoneVariants) {
        user = await this.usersRepository.findOne({ where: { phone: phoneVariant, isDeleted: false } });
        if (user) break;
      }
    }
    
    // If not found in users, check customers table
    if (!user) {
      let customer = null;
      if (looksLikeEmail) {
        customer = await this.customersRepository.findOne({
          where: { email: loginValue },
          select: ['id', 'email', 'password', 'name', 'lastName', 'phone', 'is_deleted'],
        });
      } else {
        // Try all phone variants for customers
        for (const phoneVariant of phoneVariants) {
          customer = await this.customersRepository.findOne({
            where: { phone: phoneVariant },
            select: ['id', 'email', 'password', 'name', 'lastName', 'phone', 'is_deleted'],
          });
          if (customer) break;
        }
      }

      if (customer && (customer as any).is_deleted) {
        throw this.credentialError('inactive', 'Account is inactive');
      }

      if (customer && customer.password) {
        // Verify customer password
        const isValid = await bcrypt.compare(password, customer.password);
        if (!isValid) {
          throw this.credentialError('invalid_password');
        }

        // Generate token for customer
        const token = await this.issueToken(
          { id: customer.id, email: customer.email, phone: customer.phone, roleSlug: 'customer-account', type: 'customer' },
          { subjectType: 'customer', customerId: customer.id },
          request,
        );

        return {
          accessToken: token,
          user: {
            id: customer.id,
            email: customer.email,
            name: customer.name,
            lastName: customer.lastName,
            roleSlug: 'customer-account',
          },
        };
      }

      if (customer && !customer.password) {
        throw new UnauthorizedException(
          'Account exists but password is not set. Please register to set a password.',
        );
      }
      
      // Create demo admin user if doesn't exist
      if (loginValue === 'admin@trustcart.com' && password === 'admin123') {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = this.usersRepository.create({
          email: loginValue,
          password: hashedPassword,
          name: 'Admin',
          lastName: 'User',
          roleId: 1,
          status: 'active',
        });
        
        try {
          await this.usersRepository.save(newUser);
        } catch (error) {
          console.error('Error creating user:', error);
          // If user exists but query failed, try to find them
          const existingUser = await this.usersRepository.findOne({ where: { email: loginValue } });
          if (existingUser) {
            if ((existingUser as any).isDeleted || existingUser.status !== 'active') {
              throw new UnauthorizedException('Account is inactive');
            }
            const token = await this.issueToken(
              { id: existingUser.id, email: existingUser.email, roleId: existingUser.roleId, type: 'user' },
              { subjectType: 'user', userId: existingUser.id, roleId: existingUser.roleId },
              request,
            );

            return {
              accessToken: token,
              user: {
                id: existingUser.id,
                email: existingUser.email,
                name: existingUser.name,
                lastName: existingUser.lastName,
              },
            };
          }
          throw error;
        }
        
        // Fetch role slug for the new user (if roles table exists)
        let roleSlug: string | null = null;
        try {
          const roleRows = await this.usersRepository.query(
            'SELECT slug FROM roles WHERE id = $1 LIMIT 1',
            [newUser.roleId],
          );
          if (roleRows && roleRows[0]?.slug) {
            roleSlug = roleRows[0].slug;
          }
        } catch (e) {
          // roles table might not exist in some demo setups; ignore
        }

        const token = await this.issueToken(
          { id: newUser.id, email: newUser.email, roleId: newUser.roleId, roleSlug, type: 'user' },
          { subjectType: 'user', userId: newUser.id, roleId: newUser.roleId },
          request,
        );

        return {
          accessToken: token,
          user: {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
            lastName: newUser.lastName,
            roleId: newUser.roleId,
            roleSlug,
          },
        };
      }
      
      throw this.credentialError('unknown_account');
    }

    if ((user as any).isDeleted || user.status !== 'active') {
      throw this.credentialError('inactive', 'Account is inactive');
    }

    if (!user.password) {
      throw this.credentialError('invalid_password');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw this.credentialError('invalid_password');
    }

    // Fetch primary role information for this user
    let roleSlug: string | null = null;
    try {
      if (user.roleId) {
        const roleRows = await this.usersRepository.query(
          'SELECT slug FROM roles WHERE id = $1 LIMIT 1',
          [user.roleId],
        );
        if (roleRows && roleRows[0]?.slug) {
          roleSlug = roleRows[0].slug;
        }
      }
    } catch (e) {
      // If roles table/query fails, continue without roleSlug
    }

    // Generate JWT token
    const token = await this.issueToken(
      { id: user.id, email: user.email, roleId: user.roleId, roleSlug, type: 'user' },
      { subjectType: 'user', userId: user.id, roleId: user.roleId },
      request,
    );

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        lastName: user.lastName,
        roleId: user.roleId,
        roleSlug,
      },
    };
  }

  async register(
    body: { email: string; password: string; name?: string; last_name?: string; phone?: string },
    request?: any,
  ) {
    const { email, password } = body;

    const existingUser = await this.usersRepository.findOne({ where: { email, isDeleted: false } });
    if (existingUser) {
      throw new UnauthorizedException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Use a single name field if provided; fall back to name/last_name
    let name = 'User';
    let lastName = 'Name';

    if (body.name && body.name.trim()) {
      name = body.name.trim();
      lastName = '';
    } else {
      if (body.name && body.name.trim()) {
        name = body.name.trim();
      }
      if (body.last_name && body.last_name.trim()) {
        lastName = body.last_name.trim();
      }
    }

    // Resolve the default role for self-registered users as Customer Account
    let customerRoleId = 1;
    try {
      const roleRows = await this.usersRepository.query(
        "SELECT id FROM roles WHERE slug = 'customer-account' LIMIT 1",
      );
      if (roleRows && roleRows[0]?.id) {
        customerRoleId = roleRows[0].id;
      }
    } catch (e) {
      // If roles table doesn't exist yet, fall back to role id 1
    }

    const user = this.usersRepository.create({
      email,
      password: hashedPassword,
      name,
      lastName,
      phone: body.phone || null,
      roleId: customerRoleId,
      status: 'active',
    });

    await this.usersRepository.save(user);

    // Also create a corresponding Customer record with primary stage as 'lead'
    try {
      const customerData: Partial<Customer> = {
        name,
        lastName,
        email,
        phone: body.phone || undefined,
        lifecycleStage: 'lead',
        customerType: 'new',
        status: 'active',
      };
      const customer = this.customersRepository.create(customerData);
      await this.customersRepository.save(customer);
    } catch (e) {
      // If customer creation fails, we still keep the user registered
      console.error('Failed to create Customer record for registered user:', e);
    }

    return {
      message: 'User registered successfully',
      userId: user.id,
    };
  }

  async validateJwtPayload(payload: any) {
    if (!payload?.id) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // Tokens issued before sessions existed carry no `sid`; they keep working
    // until they expire. Everything newer is only valid while its session is.
    const sessionKey = payload?.sid ? String(payload.sid) : null;
    if (sessionKey) {
      const session = await this.userSessions.touch(sessionKey);
      if (session.status !== 'active') {
        throw new UnauthorizedException({
          statusCode: 401,
          message:
            session.status !== 'revoked' || session.reason === 'logout'
              ? 'Your session has ended. Please sign in again.'
              : 'This device was signed out by an administrator.',
          code: 'SESSION_REVOKED',
        });
      }
    }

    const tokenType = payload?.type;
    const treatAsCustomer =
      tokenType === 'customer' ||
      (tokenType == null && !payload?.roleId && payload?.roleSlug === 'customer-account');

    if (treatAsCustomer) {
      const customer = await this.customersRepository.findOne({
        where: { id: Number(payload.id), is_deleted: false } as any,
        select: ['id', 'email', 'phone', 'name', 'lastName'],
      });

      if (!customer) {
        throw new UnauthorizedException('Invalid token');
      }

      return {
        id: customer.id,
        email: customer.email,
        phone: customer.phone,
        roleSlug: 'customer-account',
        type: 'customer',
        username: customer.name,
        sessionKey,
      };
    }

    const user = await this.usersRepository.findOne({
      where: { id: Number(payload.id), isDeleted: false } as any,
      select: ['id', 'email', 'phone', 'roleId', 'name', 'lastName', 'status', 'isDeleted'],
    });

    if (!user || (user as any).isDeleted || user.status !== 'active') {
      throw new UnauthorizedException('Invalid token');
    }

    let roleSlug = payload?.roleSlug ?? null;
    try {
      const roleRows = await this.usersRepository.query(
        'SELECT slug FROM roles WHERE id = $1 LIMIT 1',
        [user.roleId],
      );
      if (roleRows && roleRows[0]?.slug) {
        roleSlug = roleRows[0].slug;
      }
    } catch (e) {
      // Keep the token role slug if the roles table is unavailable.
    }

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      roleId: user.roleId,
      roleSlug,
      type: 'user',
      username: user.name,
      sessionKey,
    };
  }

  async validateToken(token: string) {
    try {
      const decoded = jwt.verify(token, requireJwtSecret());
      return { valid: true, user: decoded };
    } catch (error) {
      return { valid: false };
    }
  }
}
