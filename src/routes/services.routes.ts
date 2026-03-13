import { Router } from 'express';
import { logError } from '../utils/logger';

const router = Router();

// Lista de bancos disponibles (proxy al BNC)
router.post('/banks', async (_req, res) => {
  const baseUrl = process.env.BNC_URL_BASE;

  if (!baseUrl) {
    return res.status(500).json({
      message: 'Falta la variable de entorno BNC_URL_BASE.',
    });
  }

  try {
    const upstreamResponse = await fetch(`${baseUrl}/Services/Banks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: '{}', // El endpoint espera un objeto vacío
    });

    const data = await upstreamResponse.json().catch(() => null);

    if (!upstreamResponse.ok) {
      return res.status(upstreamResponse.status).json({
        message: 'Error al consultar la lista de bancos en el BNC.',
        statusCode: upstreamResponse.status,
        body: data,
      });
    }

    return res.status(200).json({
      message: 'Lista de bancos obtenida desde el BNC.',
      rawResponse: data,
    });
  } catch (error) {
    logError('services/banks', error);
    return res.status(500).json({
      message: 'No se pudo obtener la lista de bancos desde el BNC.',
    });
  }
});

export default router;

