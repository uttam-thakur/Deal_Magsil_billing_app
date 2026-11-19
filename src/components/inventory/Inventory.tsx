"use client";

import { useMemo, useState } from "react";
import styles from "./Inventory.module.css";
import { Field } from "@/components/common/Field";
import {
  InventoryItem,
  InventoryTransaction,
  ProductionRecord,
  Product,
} from "@/types";

type Props = {
  items: InventoryItem[];
  transactions: InventoryTransaction[];
  productions: ProductionRecord[];
  products: Product[];
  onSaveItem: (item: InventoryItem) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
  onSaveTransaction: (tx: InventoryTransaction) => Promise<void>;
  onSaveProduction: (production: ProductionRecord) => Promise<void>;
};

const blankItem = (): InventoryItem => ({
  id: "",
  name: "",
  type: "RAW_MATERIAL",
  category: "",
  unit: "Kg",
  openingStock: 0,
  minStock: 0,
  costRate: 0,
  location: "",
  supplier: "",
  batchNo: "",
  linkedProductId: "",
  active: true,
  notes: "",
  createdAt: new Date().toISOString(),
});

const blankTx = (): InventoryTransaction => ({
  id: "",
  date: new Date().toISOString().slice(0, 10),
  itemId: "",
  itemName: "",
  itemType: "RAW_MATERIAL",
  transactionType: "IN",
  quantity: 0,
  unit: "",
  rate: 0,
  referenceNo: "",
  source: "Manual",
  party: "",
  batchNo: "",
  location: "",
  notes: "",
  createdAt: new Date().toISOString(),
});

const blankProduction = (): ProductionRecord => ({
  id: "",
  date: new Date().toISOString().slice(0, 10),
  outputItemId: "",
  outputItemName: "",
  outputQuantity: 0,
  unit: "",
  batchNo: "",
  referenceNo: "",
  notes: "",
  rawMaterials: [],
  createdAt: new Date().toISOString(),
});

function stockOf(item: InventoryItem, txs: InventoryTransaction[]) {
  return (
    item.openingStock +
    txs
      .filter((t) => t.itemId === item.id)
      .reduce((sum, t) => {
        if (t.transactionType === "IN") return sum + t.quantity;
        if (t.transactionType === "OUT") return sum - t.quantity;
        return sum + t.quantity; // adjustment is signed: positive adds, negative subtracts
      }, 0)
  );
}

export function Inventory({
  items,
  transactions,
  productions,
  products,
  onSaveItem,
  onDeleteItem,
  onSaveTransaction,
  onSaveProduction,
}: Props) {
  const [section, setSection] = useState<
    "overview" | "master" | "movement" | "production"
  >("overview");
  const [draft, setDraft] = useState<InventoryItem>(blankItem());
  const [tx, setTx] = useState<InventoryTransaction>(blankTx());
  const [production, setProduction] =
    useState<ProductionRecord>(blankProduction());
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const stockRows = useMemo(
    () => items.map((i) => ({ ...i, stock: stockOf(i, transactions) })),
    [items, transactions],
  );
  const filtered = stockRows.filter((i) =>
    `${i.name} ${i.category} ${i.type}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const raw = items.filter((i) => i.type === "RAW_MATERIAL" && i.active);
  const finished = items.filter(
    (i) => i.type === "FINISHED_PRODUCT" && i.active,
  );

  const submitItem = async () => {
    if (!draft.name.trim() || busy) return;
    setBusy(true);
    try {
      await onSaveItem({
        ...draft,
        id: draft.id || crypto.randomUUID(),
        name: draft.name.trim(),
        createdAt: draft.createdAt || new Date().toISOString(),
      });
      setDraft(blankItem());
      setEditing(null);
    } finally {
      setBusy(false);
    }
  };

  const selectTxItem = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    setTx((t) => ({
      ...t,
      itemId: item.id,
      itemName: item.name,
      itemType: item.type,
      unit: item.unit,
      rate: item.costRate,
      batchNo: item.batchNo,
      location: item.location,
    }));
  };

  const submitTx = async () => {
    if (busy) return;

    if (!tx.itemId) {
      alert("Please select a material first.");
      return;
    }

    const item = items.find((i) => i.id === tx.itemId);
    if (!item) {
      alert(
        "Selected material was not found. Please select the material again.",
      );
      return;
    }

    const quantity = Number(tx.quantity);
    if (!Number.isFinite(quantity)) {
      alert("Please enter a valid quantity.");
      return;
    }

    // IN and OUT require positive quantities. ADJUSTMENT can be positive or negative.
    if (tx.transactionType === "ADJUSTMENT") {
      if (quantity === 0) {
        alert(
          "Adjustment quantity cannot be zero. Use a positive or negative value.",
        );
        return;
      }
    } else if (quantity <= 0) {
      alert("Quantity must be greater than zero.");
      return;
    }

    const current = stockOf(item, transactions);
    if (tx.transactionType === "OUT" && quantity > current + 0.000001) {
      alert(`Insufficient stock. Available: ${current} ${item.unit}`);
      return;
    }

    setBusy(true);
    try {
      await onSaveTransaction({
        ...tx,
        quantity,
        id: tx.id || crypto.randomUUID(),
        itemName: item.name,
        itemType: item.type,
        unit: item.unit,
        rate: Number(tx.rate) || 0,
        createdAt: tx.createdAt || new Date().toISOString(),
      });
      setTx(blankTx());
    } finally {
      setBusy(false);
    }
  };

  const addRaw = () => {
    if (!production.rawMaterials.length) {
      setProduction((p) => ({
        ...p,
        rawMaterials: [{ itemId: "", itemName: "", quantity: 0, unit: "Kg" }],
      }));
    } else
      setProduction((p) => ({
        ...p,
        rawMaterials: [
          ...p.rawMaterials,
          { itemId: "", itemName: "", quantity: 0, unit: "Kg" },
        ],
      }));
  };
  const updateRaw = (index: number, key: string, value: string | number) => {
    setProduction((p) => ({
      ...p,
      rawMaterials: p.rawMaterials.map((r, i) =>
        i === index ? { ...r, [key]: value } : r,
      ),
    }));
  };
  const chooseRaw = (index: number, id: string) => {
    const item = raw.find((x) => x.id === id);
    if (!item) return;
    updateRaw(index, "itemId", item.id);
    updateRaw(index, "itemName", item.name);
    updateRaw(index, "unit", item.unit);
  };
  const submitProduction = async () => {
    const out = items.find((i) => i.id === production.outputItemId);
    if (
      !out ||
      production.outputQuantity <= 0 ||
      production.rawMaterials.some((r) => !r.itemId || r.quantity <= 0) ||
      busy
    )
      return;
    for (const r of production.rawMaterials) {
      const item = items.find((i) => i.id === r.itemId);
      if (item && r.quantity > stockOf(item, transactions) + 0.000001) {
        alert(`Insufficient ${item.name} stock.`);
        return;
      }
    }
    setBusy(true);
    try {
      await onSaveProduction({
        ...production,
        id: production.id || crypto.randomUUID(),
        outputItemName: out.name,
        unit: out.unit,
        createdAt: production.createdAt || new Date().toISOString(),
      });
      setProduction(blankProduction());
    } finally {
      setBusy(false);
    }
  };

  const totalValue = stockRows.reduce(
    (s, i) => s + Math.max(0, i.stock) * i.costRate,
    0,
  );
  const lowCount = stockRows.filter((i) => i.stock <= i.minStock).length;

  return (
    <section className={styles.page}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>STOCK CONTROL</p>
          <h1>Inventory Management</h1>
          <p>
            Maintain raw materials, finished goods, production, stock IN/OUT and
            complete movement history.
          </p>
        </div>
        <div className={styles.headerStats}>
          <div>
            <b>{items.length}</b>
            <span>Materials</span>
          </div>
          <div>
            <b>{lowCount}</b>
            <span>Low Stock</span>
          </div>
          <div>
            <b>
              ₹{" "}
              {totalValue.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </b>
            <span>Stock Value</span>
          </div>
        </div>
      </div>

      <div className={styles.tabs}>
        {(
          [
            ["overview", "📊 Stock Overview"],
            ["master", "🧱 Material Master"],
            ["movement", "↕ Stock IN / OUT"],
            ["production", "🏭 Production"],
          ] as const
        ).map(([k, l]) => (
          <button
            key={k}
            className={section === k ? styles.active : ""}
            onClick={() => setSection(k)}
          >
            {l}
          </button>
        ))}
      </div>

      <div className={styles.helpStrip}>
        <div><b>Raw materials</b><span>Record every purchase/receipt with date, supplier, batch and rate.</span></div>
        <div><b>Production</b><span>Select a finished product and enter the raw-material consumption.</span></div>
        <div><b>Reorder</b><span>Set Minimum / Reorder Stock in Material Master. Dashboard will flag low stock.</span></div>
      </div>

      {section === "overview" && (
        <div className={styles.panel}>
          <div className={styles.toolbar}>
            <input
              placeholder="Search material, category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className={styles.toolbarRight}>
              <span>{filtered.length} items</span>
              <button onClick={() => setSection("master")}>＋ Add material</button>
              <button onClick={() => setSection("movement")}>↕ Stock movement</button>
              <button onClick={() => setSection("production")}>🏭 Record production</button>
            </div>
          </div>
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Material / Product</th>
                  <th>Type</th>
                  <th>Category</th>
                  <th>Stock</th>
                  <th>Unit</th>
                  <th>Min</th>
                  <th>Rate</th>
                  <th>Value</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <b>{i.name}</b>
                      <small>{i.location || "No location"}</small>
                    </td>
                    <td>
                      {i.type === "RAW_MATERIAL"
                        ? "Raw Material"
                        : "Finished Product"}
                    </td>
                    <td>{i.category || "—"}</td>
                    <td className={i.stock < 0 ? styles.negative : ""}>
                      {i.stock.toFixed(3).replace(/\.?0+$/, "")}
                    </td>
                    <td>{i.unit}</td>
                    <td>{i.minStock}</td>
                    <td>₹ {i.costRate.toFixed(2)}</td>
                    <td>₹ {(Math.max(0, i.stock) * i.costRate).toFixed(2)}</td>
                    <td>
                      <span
                        className={
                          i.stock <= i.minStock
                            ? styles.badgeWarn
                            : styles.badgeOk
                        }
                      >
                        {i.stock <= i.minStock ? "LOW" : "OK"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {section === "master" && (
        <>
          <div className={`${styles.panel} ${styles.formGrid}`}>
            <datalist id="inventory-categories">
              <option value="Cement" />
              <option value="Sand" />
              <option value="Gitti / Aggregate" />
              <option value="Colour / Pigment" />
              <option value="Chemicals / Admixture" />
              <option value="Bricks" />
              <option value="Blocks" />
              <option value="Pillars" />
              <option value="Slabs" />
              <option value="Pavers" />
              <option value="Wall / Boundary" />
              <option value="Seating / Bench / Chair" />
              <option value="Other" />
            </datalist>
            <datalist id="inventory-units">
              <option value="Kg" />
              <option value="Ton" />
              <option value="Bag" />
              <option value="Piece" />
              <option value="Nos" />
              <option value="Cubic Ft" />
              <option value="Cubic M" />
              <option value="Litre" />
              <option value="Meter" />
            </datalist>
            <Field
              label="Material / Product Name"
              value={draft.name}
              onChange={(v) => setDraft({ ...draft, name: v })}
            />
            <label>
              <span>Type</span>
              <select
                value={draft.type}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    type: e.target.value as InventoryItem["type"],
                  })
                }
              >
                <option value="RAW_MATERIAL">Raw Material</option>
                <option value="FINISHED_PRODUCT">Finished Product</option>
              </select>
            </label>
            <label>
              <span>Category</span>
              <input
                list="inventory-categories"
                placeholder={draft.type === "RAW_MATERIAL" ? "Cement, Sand, Gitti..." : "Blocks, Bricks, Pillars..."}
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              />
            </label>
            <label>
              <span>Unit</span>
              <input
                list="inventory-units"
                placeholder="Kg, Ton, Piece, Bag..."
                value={draft.unit}
                onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
              />
            </label>
            <Field
              label="Opening Stock"
              value={draft.openingStock}
              onChange={(v) => setDraft({ ...draft, openingStock: Number(v) })}
            />
            <Field
              label="Minimum / Reorder Stock (Dashboard Alert)"
              value={draft.minStock}
              onChange={(v) => setDraft({ ...draft, minStock: Number(v) })}
            />
            <Field
              label="Cost Rate"
              value={draft.costRate}
              onChange={(v) => setDraft({ ...draft, costRate: Number(v) })}
            />
            <Field
              label="Location / Yard"
              value={draft.location}
              onChange={(v) => setDraft({ ...draft, location: v })}
            />
            <Field
              label="Supplier / Source"
              value={draft.supplier}
              onChange={(v) => setDraft({ ...draft, supplier: v })}
            />
            <Field
              label="Batch No."
              value={draft.batchNo}
              onChange={(v) => setDraft({ ...draft, batchNo: v })}
            />
            {draft.type === "FINISHED_PRODUCT" && (
              <label>
                <span>Link to Sales Product</span>
                <select
                  value={draft.linkedProductId}
                  onChange={(e) =>
                    setDraft({ ...draft, linkedProductId: e.target.value })
                  }
                >
                  <option value="">Not linked</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <Field
              label="Notes"
              value={draft.notes}
              onChange={(v) => setDraft({ ...draft, notes: v })}
            />
            <div className={styles.actions}>
              <button
                className={styles.primary}
                disabled={busy}
                onClick={submitItem}
              >
                {editing ? "Update Material" : "Add Material"}
              </button>
              {editing && (
                <button
                  onClick={() => {
                    setEditing(null);
                    setDraft(blankItem());
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
          <div className={styles.panel}>
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Unit</th>
                    <th>Opening</th>
                    <th>Min</th>
                    <th>Cost</th>
                    <th>Supplier</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((i) => (
                    <tr key={i.id}>
                      <td>{i.name}</td>
                      <td>{i.type === "RAW_MATERIAL" ? "Raw" : "Finished"}</td>
                      <td>{i.unit}</td>
                      <td>{i.openingStock}</td>
                      <td>{i.minStock}</td>
                      <td>₹ {i.costRate.toFixed(2)}</td>
                      <td>{i.supplier || "—"}</td>
                      <td>
                        <button
                          onClick={() => {
                            setDraft({ ...i });
                            setEditing(i.id);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                        >
                          Edit
                        </button>{" "}
                        <button
                          className={styles.danger}
                          onClick={async () => {
                            if (
                              confirm(
                                "Delete this material master? Existing transactions will remain.",
                              )
                            )
                              await onDeleteItem(i.id);
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {section === "movement" && (
        <>
          <div className={`${styles.panel} ${styles.formGrid}`}>
            <label>
              <span>Date</span>
              <input
                type="date"
                value={tx.date}
                onChange={(e) => setTx({ ...tx, date: e.target.value })}
              />
            </label>
            <label>
              <span>Material</span>
              <select
                value={tx.itemId}
                onChange={(e) => selectTxItem(e.target.value)}
              >
                <option value="">Select material</option>
                {items
                  .filter((i) => i.active)
                  .map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.unit})
                    </option>
                  ))}
              </select>
            </label>
            <label>
              <span>Movement</span>
              <select
                value={tx.transactionType}
                onChange={(e) =>
                  setTx({
                    ...tx,
                    transactionType: e.target
                      .value as InventoryTransaction["transactionType"],
                  })
                }
              >
                <option value="IN">IN — Purchase / Receipt</option>
                <option value="OUT">OUT — Issue / Sale / Consumption</option>
                <option value="ADJUSTMENT">ADJUSTMENT — +/- Stock</option>
              </select>
            </label>
            <Field
              label={
                tx.transactionType === "ADJUSTMENT"
                  ? "Adjustment Qty (+ / -)"
                  : "Quantity"
              }
              value={tx.quantity}
              onChange={(v) => setTx({ ...tx, quantity: Number(v) })}
            />
            <Field
              label="Rate"
              value={tx.rate}
              onChange={(v) => setTx({ ...tx, rate: Number(v) })}
            />
            <Field
              label="Reference No."
              value={tx.referenceNo}
              onChange={(v) => setTx({ ...tx, referenceNo: v })}
            />
            <Field
              label="Party / Supplier"
              value={tx.party}
              onChange={(v) => setTx({ ...tx, party: v })}
            />
            <Field
              label="Batch No."
              value={tx.batchNo}
              onChange={(v) => setTx({ ...tx, batchNo: v })}
            />
            <Field
              label="Location"
              value={tx.location}
              onChange={(v) => setTx({ ...tx, location: v })}
            />
            <Field
              label="Source"
              value={tx.source}
              onChange={(v) => setTx({ ...tx, source: v })}
            />
            <Field
              label="Notes"
              value={tx.notes}
              onChange={(v) => setTx({ ...tx, notes: v })}
            />
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.primary}
                disabled={busy}
                onClick={submitTx}
              >
                {busy ? "Saving…" : "Save Stock Movement"}
              </button>
            </div>
          </div>
          <div className={styles.panel}>
            <h2>Movement History</h2>
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Material</th>
                    <th>Type</th>
                    <th>Qty</th>
                    <th>Rate</th>
                    <th>Reference</th>
                    <th>Party</th>
                    <th>Source</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {[...transactions].reverse().map((t) => (
                    <tr key={t.id}>
                      <td>{t.date}</td>
                      <td>{t.itemName}</td>
                      <td>
                        <span
                          className={
                            t.transactionType === "IN"
                              ? styles.badgeOk
                              : t.transactionType === "OUT"
                                ? styles.badgeOut
                                : styles.badgeAdjust
                          }
                        >
                          {t.transactionType}
                        </span>
                      </td>
                      <td>
                        {t.quantity} {t.unit}
                      </td>
                      <td>₹ {t.rate.toFixed(2)}</td>
                      <td>{t.referenceNo || "—"}</td>
                      <td>{t.party || "—"}</td>
                      <td>{t.source}</td>
                      <td>{t.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {section === "production" && (
        <>
          <div className={`${styles.panel} ${styles.production}`}>
            <div className={styles.formGrid}>
              <label>
                <span>Date</span>
                <input
                  type="date"
                  value={production.date}
                  onChange={(e) =>
                    setProduction({ ...production, date: e.target.value })
                  }
                />
              </label>
              <label>
                <span>Finished Product Produced</span>
                <select
                  value={production.outputItemId}
                  onChange={(e) => {
                    const x = finished.find((i) => i.id === e.target.value);
                    setProduction({
                      ...production,
                      outputItemId: e.target.value,
                      outputItemName: x?.name || "",
                      unit: x?.unit || "",
                    });
                  }}
                >
                  <option value="">Select finished product</option>
                  {finished.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </label>
              <Field
                label="Output Quantity"
                value={production.outputQuantity}
                onChange={(v) =>
                  setProduction({ ...production, outputQuantity: Number(v) })
                }
              />
              <Field
                label="Batch No."
                value={production.batchNo}
                onChange={(v) => setProduction({ ...production, batchNo: v })}
              />
              <Field
                label="Production Ref."
                value={production.referenceNo}
                onChange={(v) =>
                  setProduction({ ...production, referenceNo: v })
                }
              />
              <Field
                label="Notes"
                value={production.notes}
                onChange={(v) => setProduction({ ...production, notes: v })}
              />
            </div>
            <div className={styles.recipe}>
              <div className={styles.recipeHead}>
                <div>
                  <h2>Raw Material Consumption</h2>
                  <p className={styles.recipeHint}>Enter the actual quantity consumed to make this batch. Stock is reduced automatically.</p>
                </div>
                <button onClick={addRaw}>+ Add Material</button>
              </div>
              {production.rawMaterials.map((r, i) => (
                <div className={styles.recipeRow} key={i}>
                  <select
                    value={r.itemId}
                    onChange={(e) => chooseRaw(i, e.target.value)}
                  >
                    <option value="">Select raw material</option>
                    {raw.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name} ({x.unit})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={r.quantity}
                    onChange={(e) =>
                      updateRaw(i, "quantity", Number(e.target.value))
                    }
                  />
                  <span>{r.unit}</span>
                  <button
                    onClick={() =>
                      setProduction((p) => ({
                        ...p,
                        rawMaterials: p.rawMaterials.filter(
                          (_, idx) => idx !== i,
                        ),
                      }))
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                className={styles.primary}
                disabled={busy || !production.rawMaterials.length}
                onClick={submitProduction}
              >
                Save Production & Update Stock
              </button>
            </div>
          </div>
          <div className={styles.panel}>
            <h2>Production History</h2>
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Output</th>
                    <th>Qty</th>
                    <th>Batch</th>
                    <th>Reference</th>
                    <th>Raw Material Consumption</th>
                  </tr>
                </thead>
                <tbody>
                  {[...productions].reverse().map((p) => (
                    <tr key={p.id}>
                      <td>{p.date}</td>
                      <td>{p.outputItemName}</td>
                      <td>
                        {p.outputQuantity} {p.unit}
                      </td>
                      <td>{p.batchNo || "—"}</td>
                      <td>{p.referenceNo || "—"}</td>
                      <td>
                        {p.rawMaterials
                          .map((r) => `${r.itemName}: ${r.quantity} ${r.unit}`)
                          .join(", ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
