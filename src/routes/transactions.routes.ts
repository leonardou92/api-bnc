import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { logError } from '../utils/logger';
import {
  getCodesForOperationType,
  getOperationTypeFromCode,
  getTransactionTypeLabel,
} from '../utils/transactionTypes';

const router = Router();

/**
 * GET /api/transactions
 * Transacciones desde la BD.
 * - transactionTypeLabel se lee del campo almacenado en BD (si existe) o se calcula desde `code`.
 * - transactionTypeCode y operationType se derivan de `code` solo para lectura/filtros.
 */
router.get('/', async (req, res) => {
  try {
    const page = Number(req.query.page ?? '1');
    const pageSize = Number(req.query.pageSize ?? '20');
    const accountNumber = req.query.accountNumber
      ? String(req.query.accountNumber)
      : undefined;
    const clientId = req.query.clientId ? String(req.query.clientId) : undefined;
    const operationType = req.query.operationType
      ? String(req.query.operationType)
      : undefined;

    if (Number.isNaN(page) || page < 1) {
      return res.status(400).json({ message: 'page debe ser un número >= 1.' });
    }

    if (Number.isNaN(pageSize) || pageSize < 1 || pageSize > 200) {
      return res
        .status(400)
        .json({ message: 'pageSize debe estar entre 1 y 200.' });
    }

    const skip = (page - 1) * pageSize;

    const where: { accountNumber?: string; bankAccount?: { clientId: string }; code?: { in: string[] } } = {};
    if (accountNumber) where.accountNumber = accountNumber;
    if (clientId) where.bankAccount = { clientId };
    if (operationType) {
      const codes = getCodesForOperationType(operationType);
      if (codes.length > 0) where.code = { in: codes };
    }

    const [rows, total] = await Promise.all([
      prisma.bankTransaction.findMany({
        where,
        orderBy: { movementDate: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.bankTransaction.count({ where }),
    ]);

    const codeNum = (c: string) => {
      const n = parseInt(c, 10);
      return Number.isNaN(n) ? null : n;
    };

    const items = rows.map((row) => {
      const fromDbLabel = row.transactionTypeLabel ?? null;
      const computedLabel = getTransactionTypeLabel(row.code);

      return {
        ...row,
        transactionTypeCode: codeNum(row.code),
        operationType: getOperationTypeFromCode(row.code),
        transactionTypeLabel: fromDbLabel ?? computedLabel,
      };
    });

    const totalPages = Math.ceil(total / pageSize) || 1;

    return res.json({
      page,
      pageSize,
      total,
      totalPages,
      items,
    });
  } catch (error) {
    logError('transactions/list', error, { query: req.query });
    return res.status(500).json({ message: 'Error listando transacciones.' });
  }
});

export default router;

