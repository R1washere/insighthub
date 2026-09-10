import { ConflictException, Injectable } from "@nestjs/common";
import { User } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export type PublicUser = Pick<User, "id" | "email" | "name" | "createdAt">;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(input: {
    email: string;
    name?: string;
    passwordHash: string;
  }): Promise<PublicUser> {
    const existingUser = await this.prisma.user.findUnique({
      where: {
        email: input.email,
      },
      select: {
        id: true,
      },
    });

    if (existingUser) {
      throw new ConflictException("User with this email already exists");
    }

    return this.prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash: input.passwordHash,
      },
      select: publicUserSelect,
    });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: {
        email,
      },
    });
  }

  findPublicById(id: string): Promise<PublicUser | null> {
    return this.prisma.user.findUnique({
      where: {
        id,
      },
      select: publicUserSelect,
    });
  }
}

const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  createdAt: true,
} satisfies Record<keyof PublicUser, true>;
