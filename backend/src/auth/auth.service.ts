import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.isActive) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return null;
    }

    const { passwordHash, ...result } = user;
    return result;
  }

  async login(user: { id: string; email: string; role: string }) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      access_token: await this.jwtService.signAsync(payload),
      user,
    };
  }

  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) {
    const existing = await this.usersService.findByEmail(data.email);
    if (existing) {
      throw new Error('Email already registered');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await this.usersService.create({
      ...data,
      passwordHash,
      role: 'user',
    });

    const { passwordHash: _, ...result } = user;
    return this.login(result);
  }
}
