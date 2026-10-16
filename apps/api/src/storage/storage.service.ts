import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { FilePurpose, UserRole } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import type { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateUploadDto } from './dto/storage.dto';

@Injectable()
export class StorageService {
  private readonly client: S3Client | null;
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.client = config.get<boolean>('STORAGE_ENABLED', false)
      ? new S3Client({
          region: config.getOrThrow<string>('S3_REGION'),
          endpoint: config.get<string>('S3_ENDPOINT') || undefined,
          forcePathStyle: Boolean(config.get<string>('S3_ENDPOINT')),
          credentials: {
            accessKeyId: config.getOrThrow<string>('S3_ACCESS_KEY_ID'),
            secretAccessKey: config.getOrThrow<string>('S3_SECRET_ACCESS_KEY'),
          },
        })
      : null;
  }

  async createUpload(user: AuthUser, dto: CreateUploadDto) {
    if (!this.client)
      throw new ServiceUnavailableException('El almacenamiento externo no está configurado');
    this.authorizePurpose(user.role, dto.purpose);
    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(dto.mimeType))
      throw new BadRequestException('Tipo de archivo no permitido');
    const extension = dto.fileName.includes('.')
      ? dto.fileName
          .split('.')
          .pop()!
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '')
      : 'bin';
    const objectKey = `${user.id}/${dto.purpose.toLowerCase()}/${randomUUID()}.${extension}`;
    const command = new PutObjectCommand({
      Bucket: this.config.getOrThrow<string>('S3_BUCKET'),
      Key: objectKey,
      ContentType: dto.mimeType,
      ContentLength: dto.sizeBytes,
      Metadata: {
        owner: user.id,
        purpose: dto.purpose,
        original: encodeURIComponent(dto.fileName),
      },
    });
    return {
      objectKey,
      uploadUrl: await getSignedUrl(this.client, command, { expiresIn: 300 }),
      expiresIn: 300,
      headers: { 'Content-Type': dto.mimeType },
    };
  }

  async confirm(ownerId: string, objectKey: string) {
    if (!this.client)
      throw new ServiceUnavailableException('El almacenamiento externo no está configurado');
    if (!objectKey.startsWith(`${ownerId}/`))
      throw new ForbiddenException('No puedes confirmar este archivo');
    let object;
    try {
      object = await this.client.send(
        new HeadObjectCommand({
          Bucket: this.config.getOrThrow<string>('S3_BUCKET'),
          Key: objectKey,
        }),
      );
    } catch {
      throw new NotFoundException('El archivo todavía no existe en el almacenamiento');
    }
    const purpose = object.Metadata?.purpose as FilePurpose | undefined;
    const originalName = object.Metadata?.original
      ? decodeURIComponent(object.Metadata.original)
      : objectKey.split('/').pop()!;
    if (!purpose || !Object.values(FilePurpose).includes(purpose))
      throw new BadRequestException('Metadatos de archivo inválidos');
    const privateFile = purpose === FilePurpose.COMPANY_VERIFICATION_DOCUMENT;
    const publicUrl = privateFile
      ? ''
      : `${this.config.getOrThrow<string>('S3_PUBLIC_URL').replace(/\/$/, '')}/${objectKey.split('/').map(encodeURIComponent).join('/')}`;
    return this.prisma.fileAsset.upsert({
      where: { objectKey },
      update: {},
      create: {
        ownerId,
        purpose,
        objectKey,
        originalName,
        mimeType: object.ContentType ?? 'application/octet-stream',
        sizeBytes: object.ContentLength ?? 0,
        publicUrl,
      },
    });
  }

  async downloadUrl(user: AuthUser, id: string) {
    if (!this.client)
      throw new ServiceUnavailableException('El almacenamiento externo no está configurado');
    const asset = await this.prisma.fileAsset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException('Archivo no encontrado');
    if (asset.ownerId !== user.id && user.role !== UserRole.ADMIN)
      throw new ForbiddenException('No puedes consultar este archivo');
    if (asset.purpose !== FilePurpose.COMPANY_VERIFICATION_DOCUMENT && asset.ownerId !== user.id)
      throw new ForbiddenException('Archivo no autorizado');
    const safeName = asset.originalName.replace(/["\r\n]/g, '');
    const url = await getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.config.getOrThrow<string>('S3_BUCKET'),
        Key: asset.objectKey,
        ResponseContentDisposition: `inline; filename="${safeName}"`,
      }),
      { expiresIn: 120 },
    );
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'PRIVATE_FILE_ACCESSED',
        entity: 'FileAsset',
        entityId: asset.id,
        data: { purpose: asset.purpose, ownerId: asset.ownerId },
      },
    });
    return { url, expiresIn: 120 };
  }

  async deleteUserFiles(userId: string) {
    const files = await this.prisma.fileAsset.findMany({
      where: { ownerId: userId },
      select: { objectKey: true },
    });
    if (files.length && this.client)
      await this.client.send(
        new DeleteObjectsCommand({
          Bucket: this.config.getOrThrow<string>('S3_BUCKET'),
          Delete: { Objects: files.map((file) => ({ Key: file.objectKey })), Quiet: true },
        }),
      );
    await this.prisma.fileAsset.deleteMany({ where: { ownerId: userId } });
    return files.length;
  }

  private authorizePurpose(role: UserRole, purpose: FilePurpose): void {
    const allowed: FilePurpose[] =
      role === UserRole.CANDIDATE
        ? [FilePurpose.PROFILE_PHOTO, FilePurpose.PROJECT_ATTACHMENT, FilePurpose.CHAT_ATTACHMENT]
        : role === UserRole.COMPANY
          ? [
              FilePurpose.COMPANY_LOGO,
              FilePurpose.CHAT_ATTACHMENT,
              FilePurpose.COMPANY_VERIFICATION_DOCUMENT,
            ]
          : [];
    if (!allowed.includes(purpose))
      throw new ForbiddenException('Este tipo de archivo no corresponde a tu rol');
  }
}
