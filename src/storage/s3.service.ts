import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import 'dotenv/config';
import { UploadedFile } from './interfaces/uploaded-file.interface';

@Injectable()
export class S3Service {
  private readonly region = process.env.AWS_REGION;
  private readonly bucket = process.env.AWS_S3_BUCKET;
  private readonly accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  private readonly secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  private readonly client = new S3Client({
    region: process.env.AWS_REGION,
    credentials:
      process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          }
        : undefined,
  });

  async uploadCover(file: UploadedFile, bookId: number) {
    this.ensureConfiguration();

    const fileExtension = this.resolveExtension(file);
    const sanitizedName = this.sanitizeBaseName(file.originalname);
    const key = `books/${bookId}/covers/${Date.now()}-${randomUUID()}-${sanitizedName}${fileExtension}`;

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );
    } catch {
      throw new InternalServerErrorException(
        'No fue posible subir la portada a AWS S3',
      );
    }

    return {
      key,
      url: this.buildObjectUrl(key),
    };
  }

  private ensureConfiguration() {
    if (
      !this.region ||
      !this.bucket ||
      !this.accessKeyId ||
      !this.secretAccessKey
    ) {
      throw new InternalServerErrorException(
        'AWS S3 no está configurado correctamente',
      );
    }
  }

  private sanitizeBaseName(originalname: string) {
    const fileNameWithoutExtension = originalname.replace(extname(originalname), '');

    return fileNameWithoutExtension
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'cover';
  }

  private resolveExtension(file: UploadedFile) {
    const extensionFromName = extname(file.originalname).toLowerCase();
    if (extensionFromName) {
      return extensionFromName;
    }

    switch (file.mimetype) {
      case 'image/jpeg':
        return '.jpg';
      case 'image/png':
        return '.png';
      case 'image/webp':
        return '.webp';
      default:
        return '';
    }
  }

  private buildObjectUrl(key: string) {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }
}