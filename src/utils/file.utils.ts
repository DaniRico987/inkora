import 'multer';
import { BadRequestException } from '@nestjs/common';

const MAX_FILE_SIZE_IN_BYTES = 5 * 1024 * 1024; // 5MB

export const fileToBase64 = (
  file: Express.Multer.File,
): string => {
  if (!file) {
    throw new BadRequestException('No se ha proporcionado ningún archivo.');
  }

  if (file.size > MAX_FILE_SIZE_IN_BYTES) {
    throw new BadRequestException(
      `El archivo excede el tamaño máximo de 5MB.`,
    );
  }

  const base64 = file.buffer.toString('base64');
  return `data:${file.mimetype};base64,${base64}`;
};
