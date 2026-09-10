import { Injectable, NotFoundException } from "@nestjs/common";
import { ApiKeyService } from "../api-keys/api-key.service";
import { OrganizationsService } from "../organizations/organizations.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizationsService: OrganizationsService,
    private readonly apiKeyService: ApiKeyService,
  ) {}

  async createProject(input: {
    organizationId: string;
    userId: string;
    name: string;
    timezone?: string;
  }) {
    await this.organizationsService.assertMembership({
      organizationId: input.organizationId,
      userId: input.userId,
    });

    const projectName = input.name.trim();
    const slug = await this.createUniqueProjectSlug({
      organizationId: input.organizationId,
      baseSlug: slugify(projectName),
    });
    const apiKey = this.apiKeyService.generateProjectApiKey();

    const project = await this.prisma.project.create({
      data: {
        organizationId: input.organizationId,
        name: projectName,
        slug,
        timezone: input.timezone?.trim() || "UTC",
        apiKeys: {
          create: {
            name: "Default API key",
            keyHash: apiKey.keyHash,
            prefix: apiKey.prefix,
          },
        },
      },
      include: {
        apiKeys: {
          select: publicApiKeySelect,
        },
      },
    });

    return {
      project,
      apiKey: apiKey.rawKey,
    };
  }

  async listProjects(input: { organizationId: string; userId: string }) {
    await this.organizationsService.assertMembership(input);

    return this.prisma.project.findMany({
      where: {
        organizationId: input.organizationId,
      },
      orderBy: {
        createdAt: "asc",
      },
      include: {
        _count: {
          select: {
            apiKeys: true,
            events: true,
            funnels: true,
          },
        },
      },
    });
  }

  async getProject(input: { projectId: string; userId: string }) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: input.projectId,
        organization: {
          members: {
            some: {
              userId: input.userId,
            },
          },
        },
      },
      include: {
        apiKeys: {
          select: publicApiKeySelect,
          orderBy: {
            createdAt: "asc",
          },
        },
        _count: {
          select: {
            apiKeys: true,
            events: true,
            funnels: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException("Project not found");
    }

    return project;
  }

  async assertProjectAccess(input: { projectId: string; userId: string }) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: input.projectId,
        organization: {
          members: {
            some: {
              userId: input.userId,
            },
          },
        },
      },
      select: {
        id: true,
        organizationId: true,
        name: true,
        slug: true,
        timezone: true,
      },
    });

    if (!project) {
      throw new NotFoundException("Project not found");
    }

    return project;
  }

  async createProjectApiKey(input: {
    projectId: string;
    userId: string;
    name: string;
  }) {
    await this.assertProjectAccess({
      projectId: input.projectId,
      userId: input.userId,
    });

    const apiKey = this.apiKeyService.generateProjectApiKey();
    const createdApiKey = await this.prisma.projectApiKey.create({
      data: {
        projectId: input.projectId,
        name: input.name.trim(),
        keyHash: apiKey.keyHash,
        prefix: apiKey.prefix,
      },
      select: publicApiKeySelect,
    });

    return {
      apiKey: createdApiKey,
      token: apiKey.rawKey,
    };
  }

  async revokeProjectApiKey(input: {
    projectId: string;
    apiKeyId: string;
    userId: string;
  }) {
    await this.assertProjectAccess({
      projectId: input.projectId,
      userId: input.userId,
    });

    const apiKey = await this.prisma.projectApiKey.findFirst({
      where: {
        id: input.apiKeyId,
        projectId: input.projectId,
      },
      select: {
        id: true,
        revokedAt: true,
      },
    });

    if (!apiKey) {
      throw new NotFoundException("API key not found");
    }

    if (apiKey.revokedAt) {
      return this.prisma.projectApiKey.findUniqueOrThrow({
        where: {
          id: input.apiKeyId,
        },
        select: publicApiKeySelect,
      });
    }

    return this.prisma.projectApiKey.update({
      where: {
        id: input.apiKeyId,
      },
      data: {
        revokedAt: new Date(),
      },
      select: publicApiKeySelect,
    });
  }

  private async createUniqueProjectSlug(input: {
    organizationId: string;
    baseSlug: string;
  }) {
    const baseSlug = input.baseSlug || "project";
    let slug = baseSlug;
    let suffix = 1;

    while (
      await this.prisma.project.findUnique({
        where: {
          organizationId_slug: {
            organizationId: input.organizationId,
            slug,
          },
        },
      })
    ) {
      suffix += 1;
      slug = `${baseSlug}-${suffix}`;
    }

    return slug;
  }
}

const publicApiKeySelect = {
  id: true,
  name: true,
  prefix: true,
  createdAt: true,
  lastUsedAt: true,
  revokedAt: true,
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
