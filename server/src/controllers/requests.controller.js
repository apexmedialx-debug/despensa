const { z } = require('zod');
const db = require('../db');
const AppError = require('../utils/AppError');

async function getRequests(req, res, next) {
  try {
    if (!req.user.householdId) return res.json({ success: true, requests: [] });
    const requests = await db.getRequestsByHousehold(req.user.householdId);
    res.json({ success: true, requests });
  } catch (err) { next(err); }
}

async function createRequest(req, res, next) {
  try {
    if (!req.user.householdId) return next(new AppError('Not in a household', 400));
    const { text } = z.object({ text: z.string().min(1).max(500) }).parse(req.body);
    const request = await db.createRequest({ text, fromId: req.user.id, householdId: req.user.householdId });
    res.status(201).json({ success: true, request });
  } catch (err) {
    if (err instanceof z.ZodError) return next(new AppError(err.errors[0].message, 400));
    next(err);
  }
}

async function resolveRequest(req, res, next) {
  try {
    const { status } = z.object({ status: z.enum(['APPROVED', 'DECLINED']) }).parse(req.body);
    const existing = await db.findRequestById(req.params.id);
    if (!existing || existing.householdId !== req.user.householdId) {
      return next(new AppError('Pedido não encontrado', 404));
    }
    const request = await db.updateRequest(req.params.id, { status, resolvedById: req.user.id });
    res.json({ success: true, request });
  } catch (err) {
    if (err instanceof z.ZodError) return next(new AppError(err.errors[0].message, 400));
    next(err);
  }
}

module.exports = { getRequests, createRequest, resolveRequest };
