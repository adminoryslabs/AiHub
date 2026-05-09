// Endpoint admin de imágenes: upload a Cloudflare R2
import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { uploadImage } from '../../services/storage';
import { requirePermission } from '../../middleware/auth';
import { ValidationError } from '../../middleware/error-handler';

const router = Router();

router.use(requirePermission('image.upload'));

// Configuración de multer: almacenamiento en memoria (buffer)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB máximo
  },
  fileFilter: (_req, file, cb) => {
    const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`));
    }
  },
});

// POST /api/v1/admin/images/upload — subir imagen a R2
router.post(
  '/upload',
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw new ValidationError('Se requiere un archivo de imagen');
      }

      const result = await uploadImage(
        req.file.buffer,
        req.file.mimetype,
        req.file.originalname
      );

      res.json({ data: result });
    } catch (err) {
      // Convertir errores de multer a ValidationError
      if (err instanceof Error && err.message.includes('File too large')) {
        next(new ValidationError('El archivo excede el tamaño máximo de 5MB'));
      } else {
        next(err);
      }
    }
  }
);

export default router;
