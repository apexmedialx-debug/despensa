const db = require('../db');
const AppError = require('../utils/AppError');

async function getSpending(req, res, next) {
  try {
    if (!req.user.householdId) return res.json({ success: true, spending: emptySpending() });

    const items = await db.getItemsByHousehold(req.user.householdId);
    const members = await db.getUsersByHousehold(req.user.householdId);

    const totalValue = items.reduce((s, i) => s + i.qty * i.pricePerUnit, 0);

    const perUser = {};
    for (const m of members) {
      const ownItems = items.filter(i => i.ownerId === m.id && !i.isShared);
      const sharedItems = items.filter(i => i.isShared);
      const ownValue = ownItems.reduce((s, i) => s + i.qty * i.pricePerUnit, 0);
      const sharedPortion = members.length > 0
        ? sharedItems.reduce((s, i) => s + (i.qty * i.pricePerUnit) / members.length, 0)
        : 0;
      perUser[m.id] = {
        user: { id: m.id, name: m.name, avatarInitials: m.avatarInitials, avatarColor: m.avatarColor },
        ownValue: round2(ownValue),
        sharedPortion: round2(sharedPortion),
        total: round2(ownValue + sharedPortion),
      };
    }

    const perCategory = {};
    for (const item of items) {
      perCategory[item.category] = round2((perCategory[item.category] || 0) + item.qty * item.pricePerUnit);
    }

    const restockItems = items.filter(i => i.qty <= i.threshold);
    const restockCost = restockItems.reduce((s, i) => s + Math.max(0, i.maxQty - i.qty) * i.pricePerUnit, 0);

    res.json({
      success: true,
      spending: {
        totalPantryValue: round2(totalValue),
        perUser,
        perCategory,
        restockEstimate: round2(restockCost),
        lowStockCount: restockItems.length,
      },
    });
  } catch (err) { next(err); }
}

function round2(n) { return Math.round(n * 100) / 100; }
function emptySpending() {
  return { totalPantryValue: 0, perUser: {}, perCategory: {}, restockEstimate: 0, lowStockCount: 0 };
}

module.exports = { getSpending };
