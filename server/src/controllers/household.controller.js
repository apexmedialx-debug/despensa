const { z } = require('zod');
const crypto = require('crypto');
const db = require('../db');
const AppError = require('../utils/AppError');

async function getHousehold(req, res, next) {
  try {
    if (!req.user.householdId) return next(new AppError('Not in a household', 404));
    const household = await db.findHouseholdById(req.user.householdId);
    if (!household) return next(new AppError('Household not found', 404));
    const members = await db.getUsersByHousehold(req.user.householdId);
    const safeMembers = members.map(({ password, pushSubscription, ...m }) => m);
    res.json({ success: true, household: { ...household, members: safeMembers } });
  } catch (err) { next(err); }
}

async function joinHousehold(req, res, next) {
  try {
    const { inviteCode } = z.object({ inviteCode: z.string().min(1) }).parse(req.body);
    const household = await db.findHouseholdByInviteCode(inviteCode);
    if (!household) return next(new AppError('Código de convite inválido', 404));
    if (req.user.householdId) return next(new AppError('Já estás numa casa', 400));

    const user = await db.updateUser(req.user.id, { householdId: household.id, role: 'DEPENDENT' });
    const { password, ...safeUser } = user;
    res.json({ success: true, household, user: safeUser });
  } catch (err) {
    if (err instanceof z.ZodError) return next(new AppError(err.errors[0].message, 400));
    next(err);
  }
}

async function updateMember(req, res, next) {
  try {
    const { role } = z.object({ role: z.enum(['SHOPPER', 'DEPENDENT']) }).parse(req.body);
    const member = await db.findUserById(req.params.id);
    if (!member || member.householdId !== req.user.householdId) return next(new AppError('Membro não encontrado', 404));
    const updated = await db.updateUser(req.params.id, { role });
    const { password, ...safeUser } = updated;
    res.json({ success: true, user: safeUser });
  } catch (err) {
    if (err instanceof z.ZodError) return next(new AppError(err.errors[0].message, 400));
    next(err);
  }
}

async function removeMember(req, res, next) {
  try {
    if (req.params.id === req.user.id) return next(new AppError('Não podes remover-te a ti mesmo', 400));
    const member = await db.findUserById(req.params.id);
    if (!member || member.householdId !== req.user.householdId) return next(new AppError('Membro não encontrado', 404));
    await db.updateUser(req.params.id, { householdId: null });
    res.json({ success: true });
  } catch (err) { next(err); }
}

async function regenerateInvite(req, res, next) {
  try {
    if (!req.user.householdId) return next(new AppError('Not in a household', 404));
    const inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    await db.updateHousehold(req.user.householdId, { inviteCode });
    res.json({ success: true, inviteCode });
  } catch (err) { next(err); }
}

module.exports = { getHousehold, joinHousehold, updateMember, removeMember, regenerateInvite };
