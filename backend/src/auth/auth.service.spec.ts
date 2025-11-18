import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;

  const mockUser = {
    id: 'user-1',
    tenantId: 'tenant-1',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    role: UserRole.BUYER,
    profileJson: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-token'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));

      const result = await service.validateUser('tenant-1', 'test@example.com', 'password');

      expect(result).toEqual(mockUser);
      expect(usersService.findByEmail).toHaveBeenCalledWith('tenant-1', 'test@example.com');
    });

    it('should return null when user does not exist', async () => {
      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(null);

      const result = await service.validateUser('tenant-1', 'test@example.com', 'password');

      expect(result).toBeNull();
    });

    it('should return null when password is invalid', async () => {
      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false));

      const result = await service.validateUser('tenant-1', 'test@example.com', 'wrong-password');

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return access token and user info', async () => {
      const result = await service.login(mockUser);

      expect(result).toEqual({
        access_token: 'mock-token',
        user: {
          id: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
          tenantId: mockUser.tenantId,
        },
      });
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        tenantId: mockUser.tenantId,
        role: mockUser.role,
      });
    });
  });

  describe('register', () => {
    it('should create a new user and return login tokens', async () => {
      jest.spyOn(usersService, 'create').mockResolvedValue(mockUser);

      const result = await service.register('tenant-1', 'test@example.com', 'password');

      expect(result).toEqual({
        access_token: 'mock-token',
        user: {
          id: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
          tenantId: mockUser.tenantId,
        },
      });
      expect(usersService.create).toHaveBeenCalledWith({
        tenantId: 'tenant-1',
        email: 'test@example.com',
        password: 'password',
        role: undefined,
      });
    });
  });
});
