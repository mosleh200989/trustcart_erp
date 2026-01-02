import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { Customer } from '../customers/customer.entity';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Customer)
    private customersRepository: Repository<Customer>,
  ) {}

  async login(identifier: string, password: string) {
    const loginValue = (identifier || '').toString().trim();
    if (!loginValue) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const looksLikeEmail = loginValue.includes('@');

    // First, try to find in users table
    const user = looksLikeEmail
      ? await this.usersRepository.findOne({ where: { email: loginValue } })
      : await this.usersRepository.findOne({ where: { phone: loginValue } });
    
    // If not found in users, check customers table
    if (!user) {
      const customer = await this.customersRepository.findOne({
        where: looksLikeEmail ? { email: loginValue } : { phone: loginValue },
        select: ['id', 'email', 'password', 'name', 'lastName', 'phone'],
      });
      
      if (customer && customer.password) {
        // Verify customer password
        const isValid = await bcrypt.compare(password, customer.password);
        if (!isValid) {
          throw new UnauthorizedException('Invalid credentials');
        }

        // Generate token for customer
        const token = jwt.sign(
          { id: customer.id, email: customer.email, phone: customer.phone, roleSlug: 'customer-account' },
          process.env.JWT_SECRET || 'trustcart-erp-secret-key-2024',
          { expiresIn: '24h' }
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
            const token = jwt.sign(
              { id: existingUser.id, email: existingUser.email },
              process.env.JWT_SECRET || 'trustcart-erp-secret-key-2024',
              { expiresIn: '24h' }
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

        const token = jwt.sign(
          { id: newUser.id, email: newUser.email, roleId: newUser.roleId, roleSlug },
          process.env.JWT_SECRET || 'trustcart-erp-secret-key-2024',
          { expiresIn: '24h' }
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
      
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
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
    const token = jwt.sign(
      { id: user.id, email: user.email, roleId: user.roleId, roleSlug },
      process.env.JWT_SECRET || 'trustcart-erp-secret-key-2024',
      { expiresIn: '24h' }
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

  async register(body: { email: string; password: string; name?: string; last_name?: string; phone?: string }) {
    const { email, password } = body;

    const existingUser = await this.usersRepository.findOne({ where: { email } });
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

  async validateToken(token: string) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'trustcart-erp-secret-key-2024');
      return { valid: true, user: decoded };
    } catch (error) {
      return { valid: false };
    }
  }
}
