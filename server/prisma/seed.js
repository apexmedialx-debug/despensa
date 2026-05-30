require('dotenv').config();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { migrate, createHousehold, createUser, createItem, createRequest, db } = require('../src/db');

async function main() {
  console.log('🌱 Running migrations...');
  await migrate();

  console.log('🧹 Clearing existing data...');
  await db.executeMultiple(`
    DELETE FROM refresh_tokens;
    DELETE FROM requests;
    DELETE FROM items;
    DELETE FROM users;
    DELETE FROM households;
  `);

  console.log('🏠 Creating household...');
  const password = await bcrypt.hash('pantry123', 12);

  const household = await createHousehold({
    name: 'Nossa Casa',
    inviteCode: 'PANTRY',
  });

  const mom = await createUser({
    name: 'Mãe',
    email: 'mae@casa.com',
    password,
    role: 'SHOPPER',
    avatarColor: '#AF52DE',
    avatarInitials: 'MÃ',
    householdId: household.id,
  });

  const dad = await createUser({
    name: 'Pai',
    email: 'pai@casa.com',
    password,
    role: 'SHOPPER',
    avatarColor: '#FF9500',
    avatarInitials: 'PA',
    householdId: household.id,
  });

  const me = await createUser({
    name: 'Eu',
    email: 'eu@casa.com',
    password,
    role: 'DEPENDENT',
    avatarColor: '#30B0C7',
    avatarInitials: 'EU',
    householdId: household.id,
  });

  console.log('🥛 Creating items...');
  const items = [
    { name: 'Leite Inteiro',        qty: 2, maxQty: 6, unit: 'L',       category: 'Laticínios', threshold: 1, pricePerUnit: 0.99, isShared: true,  ownerId: null    },
    { name: 'Iogurte Grego',        qty: 3, maxQty: 6, unit: 'potes',   category: 'Laticínios', threshold: 2, pricePerUnit: 1.50, isShared: false, ownerId: dad.id  },
    { name: 'Queijo Cheddar',       qty: 1, maxQty: 3, unit: 'bloco',   category: 'Laticínios', threshold: 1, pricePerUnit: 3.49, isShared: true,  ownerId: null    },
    { name: 'Pão Integral',         qty: 2, maxQty: 4, unit: 'unid',    category: 'Padaria',    threshold: 1, pricePerUnit: 1.99, isShared: true,  ownerId: null    },
    { name: 'Massa',                qty: 5, maxQty: 10,unit: 'caixas',  category: 'Despensa',   threshold: 2, pricePerUnit: 0.89, isShared: true,  ownerId: null    },
    { name: 'Azeite',               qty: 1, maxQty: 3, unit: 'garrafa', category: 'Despensa',   threshold: 1, pricePerUnit: 5.99, isShared: true,  ownerId: null    },
    { name: 'Molho de Tomate',      qty: 4, maxQty: 8, unit: 'frascos', category: 'Despensa',   threshold: 2, pricePerUnit: 1.29, isShared: true,  ownerId: null    },
    { name: 'Arroz Integral',       qty: 2, maxQty: 4, unit: 'sacos',   category: 'Despensa',   threshold: 1, pricePerUnit: 2.49, isShared: false, ownerId: me.id   },
    { name: 'Manteiga de Amêndoa',  qty: 1, maxQty: 2, unit: 'frasco',  category: 'Despensa',   threshold: 1, pricePerUnit: 4.99, isShared: false, ownerId: dad.id  },
    { name: 'Café',                 qty: 2, maxQty: 4, unit: 'sacos',   category: 'Bebidas',    threshold: 1, pricePerUnit: 3.99, isShared: true,  ownerId: null    },
  ];

  for (const item of items) {
    await createItem({ ...item, householdId: household.id });
  }

  console.log('📋 Creating sample requests...');
  await createRequest({ text: 'Sumo de Laranja — 1 cartão',   fromId: dad.id, householdId: household.id });
  await createRequest({ text: 'Iogurte Grego — 2 potes',      fromId: me.id,  householdId: household.id });

  const { updateRequest, findRequestById, db: dbRef } = require('../src/db');
  // Approve one request
  const allReqs = await dbRef.execute({ sql: 'SELECT id FROM requests WHERE from_id = ?', args: [me.id] });
  if (allReqs.rows[0]) {
    await updateRequest(allReqs.rows[0].id, { status: 'APPROVED', resolvedById: mom.id });
  }

  console.log('\n✅ Seed complete!\n');
  console.log('📧 Test accounts (password: pantry123)');
  console.log('   mae@casa.com   → SHOPPER (Gestor)');
  console.log('   pai@casa.com   → SHOPPER (Gestor)');
  console.log('   eu@casa.com    → DEPENDENT (Membro)');
  console.log('   Invite code: PANTRY\n');
}

main()
  .catch(e => { console.error('Seed error:', e); process.exit(1); })
  .finally(() => process.exit(0));
