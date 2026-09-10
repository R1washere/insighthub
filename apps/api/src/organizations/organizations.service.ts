import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrganization(input: { name: string; userId: string }) {
    const name = input.name.trim();
    const baseSlug = slugify(name);
    const slug = await this.createUniqueSlug(baseSlug);

    return this.prisma.organization.create({
      data: {
        name,
        slug,
        members: {
          create: {
            userId: input.userId,
            role: "owner",
          },
        },
      },
      include: {
        members: {
          select: {
            id: true,
            role: true,
            userId: true,
            createdAt: true,
          },
        },
      },
    });
  }

  listForUser(userId: string) {
    return this.prisma.organization.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      include: {
        members: {
          where: {
            userId,
          },
          select: {
            role: true,
          },
        },
        _count: {
          select: {
            projects: true,
            members: true,
          },
        },
      },
    });
  }

  async assertMembership(input: { organizationId: string; userId: string }) {
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: input.organizationId,
          userId: input.userId,
        },
      },
    });

    if (!membership) {
      throw new NotFoundException("Organization not found");
    }

    return membership;
  }

  private async createUniqueSlug(baseSlug: string) {
    let slug = baseSlug || "organization";
    let suffix = 1;

    while (await this.prisma.organization.findUnique({ where: { slug } })) {
      suffix += 1;
      slug = `${baseSlug}-${suffix}`;
    }

    return slug;
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
