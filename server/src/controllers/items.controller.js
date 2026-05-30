const { z } = require('zod');
const db = require('../db');
const AppError = require('../utils/AppError');
const { sendPushToUser } = require('../utils/webPush');

const itemSchema = z.object({
  name: z.string().min(1).max(200),
  qty: z.number().min(0),
  maxQty: z.number().min(0),
  unit: z.string().min(1).max(50),
  pricePerUnit: z.number().min(0).optional().default(0),
  category: z.string().min(1).max(100),
  threshold: z.number().min(0).optional().default(1),
  isShared: z.boolean().optional().default(false),
  ownerId: z.string().optional().nullable(),
});

const updateItemSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  qty: z.number().min(0).optional(),
  maxQty: z.number().min(0).optional(),
  unit: z.string().min(1).max(50).optional(),
  pricePerUnit: z.number().min(0).optional(),
  category: z.string().min(1).max(100).optional(),
  threshold: z.number().min(0).optional(),
  isShared: z.boolean().optional(),
  ownerId: z.string().optional().nullable(),
});

async function getItems(req, res, next) {
  try {
    if (!req.user.householdId) return res.json({ success: true, items: [] });
    const items = await db.getItemsByHousehold(req.user.householdId);
    res.json({ success: true, items });
  } catch (err) { next(err); }
}

async function createItem(req, res, next) {
  try {
    if (!req.user.householdId) return next(new AppError('Not in a household', 400));
    const data = itemSchema.parse(req.body);
    const item = await db.createItem({ ...data, householdId: req.user.householdId });
    res.status(201).json({ success: true, item });
  } catch (err) {
    if (err instanceof z.ZodError) return next(new AppError(err.errors[0].message, 400));
    next(err);
  }
}

async function updateItem(req, res, next) {
  try {
    const existing = await db.findItemById(req.params.id);
    if (!existing || existing.householdId !== req.user.householdId) {
      return next(new AppError('Item não encontrado', 404));
    }

    if (req.user.role === 'DEPENDENT') {
      if (existing.ownerId && existing.ownerId !== req.user.id) {
        return next(new AppError('Forbidden', 403));
      }
      const { qty } = z.object({ qty: z.number().min(0) }).parse(req.body);
      const item = await db.updateItem(req.params.id, { qty });
      await checkLowStockPush(item, req.user.householdId);
      return res.json({ success: true, item });
    }

    const data = updateItemSchema.parse(req.body);
    const item = await db.updateItem(req.params.id, data);
    await checkLowStockPush(item, req.user.householdId);
    res.json({ success: true, item });
  } catch (err) {
    if (err instanceof z.ZodError) return next(new AppError(err.errors[0].message, 400));
    next(err);
  }
}

async function deleteItem(req, res, next) {
  try {
    const existing = await db.findItemById(req.params.id);
    if (!existing || existing.householdId !== req.user.householdId) {
      return next(new AppError('Item não encontrado', 404));
    }
    await db.deleteItem(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
}

async function checkLowStockPush(item, householdId) {
  if (item.qty > item.threshold) return;
  try {
    const members = await db.getUsersByHousehold(householdId);
    const shoppers = members.filter(m => m.role === 'SHOPPER' && m.pushSubscription);
    for (const shopper of shoppers) {
      await sendPushToUser(shopper.pushSubscription, {
        title: 'Despensa — Stock Baixo',
        body: `${item.name} está a acabar (${item.qty} ${item.unit} restante${item.qty !== 1 ? 's' : ''})`,
      });
    }
  } catch (e) { console.error('[pushNotif]', e.message); }
}

module.exports = { getItems, createItem, updateItem, deleteItem };
