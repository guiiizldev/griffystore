const assert = require("node:assert/strict");
const { parseList, validateDevice } = require("../src/server/showcase");
const { offerMoney, offerModel } = require("../src/server/showcase-offers");
const fs = require("node:fs");
const path = require("node:path");
for (const model of ["iPhone 16e", "iPhone 17e", "iPhone Air", "iPhone 18 Pro", "iPhone 18 Pro Max", "iPhone Duo"]) {
  const device = validateDevice({ model, storage: "256GB", condition: "Lacrado", price: 5000 });
  assert.equal(device.imageKind, "reference", `${model} must have its own reference photo`);
  const photo = fs.readFileSync(path.join(__dirname, "../store/assets/devices", path.basename(device.image)));
  assert.equal(photo.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.ok(photo.readUInt32BE(16) >= 400 && photo.readUInt32BE(20) >= 400);
}
assert.equal(offerMoney("10:799,90").value, 10799.9);
assert.equal(offerMoney("2397,900").value, 2397.9);
assert.equal(offerMoney("1979,0").value, 1979);
assert.equal(offerMoney("2397,901"), null, "Do not guess non-zero thousandths");
assert.equal(offerModel("16 PM 256GB").model, "iPhone 16 Pro Max");
assert.equal(offerModel("16 pro eSIM 128 lacrado importado CPO").storage, "128GB");
assert.equal(offerModel("17 pro Max 1tb eSIM").storage, "1TB");
assert.equal(offerModel("iphone duo 512 gb lacrado").model, "iPhone Duo");
const text = `*SEMINOVOS*
De: 7499,90
*17 Pro 512GB*
6990
100%
De: 5899,90
*16 PM 256GB*
5579,90
De: 3799,90
*15 Plus 128GB*
3399,90
100% 92% 91%
100%
Lacrados
------------------
De: 6399,90
15 pro max 256 eSIM+chip fisico lacrado CPO 1 ano de garantia
Preto (eSIM)
Natural (eSIM)
Branco (chip)
R$5990,90
------------------
De:7599,90
17 pro 256 eSIM lacrado importado
Silver
R$7398,90
Azul
R$7299,90
Laranja
R$7099,90
------------------
De:
17 pro Max 256 eSIM lacrado importado
Azul
Laranja
R$7593,99
De:8199,90
Silver
R$7798,90
------------------
De:10:799,90
18 pro max 1tb eSIM lacrado importado
Azul
Silver
R$10.388,90`;
const rows = parseList(text);
assert.equal(rows.length, 14);
assert.ok(rows.every(row => row.device && !row.error && row.needsReview));
assert.equal(rows[0].device.model, "iPhone 17 Pro");
assert.equal(rows[0].device.price, 6990);
assert.equal(rows[0].device.previousPrice, 7499.9);
assert.equal(rows[0].device.battery, 100);
assert.equal(rows[0].device.condition, "Seminovo");
assert.equal(rows[1].device.model, "iPhone 16 Pro Max");
assert.equal(rows[2].device.battery, null);
assert.match(rows[2].device.notes, /100%.*92%.*91%/);
assert.match(rows[2].warning, /Varias baterias/);
assert.deepEqual(rows.slice(3, 6).map(row => row.device.color), ["Preto", "Natural", "Branco"]);
assert.ok(rows.slice(3, 6).every(row => row.device.price === 5990.9 && row.device.condition === "Lacrado"));
assert.match(rows[3].device.notes, /CPO.*garantia.*eSIM/);
assert.deepEqual(rows.slice(6, 9).map(row => row.device.price), [7398.9, 7299.9, 7099.9]);
assert.equal(rows[9].device.previousPrice, null);
assert.equal(rows[11].device.previousPrice, 8199.9);
assert.equal(rows[11].device.price, 7798.9);
assert.equal(rows[12].device.imageKind, "reference");
assert.equal(rows[12].device.price, 10388.9);
assert.match(rows[12].device.image, /iphone-18-pro-max\.png$/);
assert.equal(parseList("LACRADOS\nDe: 5000\niPhone 99 Pro 128GB\n4000")[0].device.imageKind, "missing");
const incomplete = parseList("SEMINOVOS\nDe: 3500\n13 128GB\n2397,901");
assert.equal(incomplete[0].device, null);
assert.match(incomplete[0].warning, /Preco invalido/);
assert.equal(parseList("LACRADOS\nDe:4000\n14 128\nBranco (1)\n3000")[0].device.quantity, 1);
assert.ok(parseList("LACRADOS\nDe:4000\n14 128\n3000\n14 128\n3000")[1].error);
assert.throws(() => validateDevice({ ...rows[0].input, previousPrice: 100 }));
console.log("Offer import: De/retail prices, PM aliases, storage units, color price groups, CPO/SIM notes, multiple batteries and decimal review passed.");
