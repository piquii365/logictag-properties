import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';

export function multerOptions(folder: string): MulterOptions {
  return {
    storage: diskStorage({
      destination: (_, __, cb) => {
        const uploadPath = `./uploads/${folder}`;

        if (!existsSync(uploadPath)) {
          mkdirSync(uploadPath, { recursive: true });
        }

        cb(null, uploadPath);
      },

      filename: (_, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

        cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),

    limits: {
      fileSize: 3 * 1024 * 1024,
    },

    fileFilter: (_, file, cb) => {
      const allowedMimeTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
      ];

      if (!allowedMimeTypes.includes(file.mimetype)) {
        return cb(
          new BadRequestException('Only JPG, PNG and WEBP images are allowed'),
          false,
        );
      }

      cb(null, true);
    },
  };
}

export function documentMulterOptions(folder: string): MulterOptions {
  return {
    storage: diskStorage({
      destination: (_, __, cb) => {
        const uploadPath = `./uploads/${folder}`;

        if (!existsSync(uploadPath)) {
          mkdirSync(uploadPath, { recursive: true });
        }

        cb(null, uploadPath);
      },

      filename: (_, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),

    limits: {
      fileSize: 10 * 1024 * 1024,
    },

    fileFilter: (_req, file, cb) => {
      const allowed = new Set<string>([
        'text/plain',
        'text/markdown',
        'text/csv',
        'application/json',
        'application/xml',
        'application/xhtml+xml',
        'application/javascript',
        'application/x-yaml',
        'application/pdf',
      ]);
      const docxMimes = [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      if (
        !file.mimetype.startsWith('text/') &&
        !allowed.has(file.mimetype) &&
        !docxMimes.includes(file.mimetype)
      ) {
        return cb(
          new BadRequestException(
            'Only text-like files, PDF, and DOCX are allowed.',
          ),
          false,
        );
      }
      cb(null, true);
    },
  };
}
