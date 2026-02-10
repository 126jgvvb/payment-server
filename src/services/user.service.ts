import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserRepository } from '../repositories/user.repository';
import { UserEntity } from '../entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserRepository)
    private readonly userRepository: UserRepository,
  ) {}

  async createUser(data: {
    fullName: string;
    email: string;
    phoneNumber: string;
    password: string;
    walletId?: string;
  }): Promise<UserEntity> {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = this.userRepository.create({
      ...data,
      password: hashedPassword,
    });
    return this.userRepository.save(user);
  }

  async findByPhoneNumber(phoneNumber: string): Promise<UserEntity | null> {
    return this.userRepository.findByPhoneNumber(phoneNumber);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.userRepository.findByEmail(email);
  }

  async findById(id: string): Promise<UserEntity | null> {
    return this.userRepository.findById(id);
  }

  async updateUser(
    id: string,
    data: {
      fullName?: string;
      email?: string;
      phoneNumber?: string;
      password?: string;
      walletId?: string;
    },
  ): Promise<UserEntity | null> {
    const user = await this.userRepository.findOne({
      where: { id },
    });
    if (!user) {
      return null;
    }

    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }

    Object.assign(user, data);
    return this.userRepository.save(user);
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await this.userRepository.delete(id);
    return (result.affected || 0) > 0;
  }

  async validatePassword(
    user: UserEntity,
    password: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, user.password);
  }
}
