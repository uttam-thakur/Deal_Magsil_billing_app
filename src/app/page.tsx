"use client";

import styles from "./Home.module.css";
import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  startTransition,
} from "react";
import toast, { Toaster } from "react-hot-toast";

/* =========================================================
   COMMON COMPONENTS
   ========================================================= */

import { Login } from "@/components/auth/Login";
import { getUserRole } from "@/lib/cloudApi";
import { AppLoader } from "@/components/common/AppLoader";

/* =========================================================
   LIBRARIES
   ========================================================= */

import {
  companyDefaults,
  createInvoice,
  emptyParty,
  starterProducts,
} from "@/lib/defaults";

import { calc, normalizeInvoice } from "@/lib/billing";

import {
  bootstrap,
  clearCloudSession,
  getCloudUrl,
  getStamp,
  getToken,
  saveEntity,
} from "@/lib/cloudApi";

/* =========================================================
   TYPES
   ========================================================= */

import {
  CompanySettings,
  Customer,
  Invoice,
  Item,
  LedgerEntry,
  Party,
  Product,
  InventoryItem,
  InventoryTransaction,
  ProductionRecord,
  Lead,
  Worker,
  AttendanceRecord,
  ServiceProvider,
  PurchaseRecord,
} from "@/types";

/* =========================================================
   DYNAMIC COMPONENTS
   IMPORTANT:
   Each component is declared ONLY ONCE.
   ========================================================= */

const Dashboard = dynamic(
  () =>
    import("@/components/dashboard/Dashboard").then(
      (m) => m.Dashboard,
    ),
  {
    loading: () => <AppLoader label="Loading dashboard…" />,
  },
);

const Billing = dynamic(
  () =>
    import("@/components/billing/Billing").then(
      (m) => m.Billing,
    ),
  {
    loading: () => <AppLoader label="Opening bill editor…" />,
  },
);

const Invoices = dynamic(
  () =>
    import("@/components/invoices/Invoices").then(
      (m) => m.Invoices,
    ),
  {
    loading: () => <AppLoader label="Loading bills…" />,
  },
);

const Ledger = dynamic(
  () =>
    import("@/components/ledger/Ledger").then(
      (m) => m.Ledger,
    ),
  {
    loading: () => <AppLoader label="Loading ledger…" />,
  },
);

const Debtors = dynamic(
  () => import("@/components/debtors/Debtors").then((m) => m.Debtors),
  { loading: () => <AppLoader label="Loading debtor register…" /> },
);

const Products = dynamic(
  () =>
    import("@/components/products/Products").then(
      (m) => m.Products,
    ),
  {
    loading: () => <AppLoader label="Loading products…" />,
  },
);

const Inventory = dynamic(
  () => import("@/components/inventory/Inventory").then((m) => m.Inventory),
  { loading: () => <AppLoader label="Loading inventory…" /> },
);

const Customers = dynamic(
  () =>
    import("@/components/customers/Customers").then(
      (m) => m.Customers,
    ),
  {
    loading: () => <AppLoader label="Loading customers…" />,
  },
);

const Leads = dynamic(
  () =>
    import("@/components/leads/Leads").then(
      (m) => m.Leads,
    ),
  {
    loading: () => <AppLoader label="Loading leads…" />,
  },
);


const Attendance = dynamic(
  () => import("@/components/attendance/Attendance").then((m) => m.Attendance),
  { loading: () => <AppLoader label="Loading attendance…" /> },
);

const ServiceProviders = dynamic(() => import("@/components/providers/ServiceProviders").then((m) => m.ServiceProviders), { loading: () => <AppLoader label="Loading service providers…" /> });

const Purchases = dynamic(() => import("@/components/purchases/Purchases").then((m) => m.Purchases), { loading: () => <AppLoader label="Loading purchases…" /> });

const Settings = dynamic(
  () =>
    import("@/components/settings/Settings").then(
      (m) => m.Settings,
    ),
  {
    loading: () => <AppLoader label="Loading company settings…" />,
  },
);

const InvoicePreview = dynamic(() =>
  import("@/components/invoice/InvoicePreview").then(
    (m) => m.InvoicePreview,
  ),
);

const BillPreviewModal = dynamic(() =>
  import("@/components/invoice/BillPreviewModal").then(
    (m) => m.BillPreviewModal,
  ),
);

/* =========================================================
   TAB TYPE
   ========================================================= */

type Tab =
  | "dashboard"
  | "billing"
  | "invoices"
  | "debtors"
  | "ledger"
  | "products"
  | "inventory"
  | "customers"
  | "leads"
  | "attendance"
  | "providers"
  | "purchases"
  | "settings";

/* =========================================================
   CLOUD STATE
   ========================================================= */

type CloudState = {
  company: CompanySettings;
  products: Product[];
  customers: Customer[];
  invoices: Invoice[];
  ledgerEntries: LedgerEntry[];
  inventoryItems: InventoryItem[];
  inventoryTransactions: InventoryTransaction[];
  production: ProductionRecord[];
  leads: Lead[];
  workers: Worker[];
  attendance: AttendanceRecord[];
  serviceProviders: ServiceProvider[];
  purchases: PurchaseRecord[];
  user: {
    username: string;
  };
};

/* =========================================================
   EMPTY CLOUD STATE
   ========================================================= */

const emptyCloud: CloudState = {
  company: companyDefaults,
  products: starterProducts,
  customers: [],
  invoices: [],
  ledgerEntries: [],
  inventoryItems: [],
  inventoryTransactions: [],
  production: [],
  leads: [],
  workers: [],
  attendance: [],
  serviceProviders: [],
  purchases: [],
  user: {
    username: "",
  },
};

/* =========================================================
   HOME COMPONENT
   ========================================================= */

export default function Home() {
  /* =======================================================
     STATE
     ======================================================= */

  const [tab, setTab] = useState<Tab>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [cloud, setCloud] = useState<CloudState>(emptyCloud);

  const [invoice, setInvoice] = useState<Invoice>(() =>
    createInvoice(),
  );

  const [hydrated, setHydrated] = useState(false);

  const [search, setSearch] = useState("");

  const [error, setError] = useState("");

  const [previewInvoice, setPreviewInvoice] =
    useState<Invoice | null>(null);

  const [busy, setBusy] = useState(false);

  const [busyLabel, setBusyLabel] =
    useState("Working…");

  /* =======================================================
     BUSY / LOADER HANDLER
     ======================================================= */

  const runBusy = useCallback(
    async <T,>(
      label: string,
      task: () => Promise<T>,
    ) => {
      setBusy(true);
      setBusyLabel(label);

      try {
        return await task();
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  /* =======================================================
     LOAD CLOUD DATA
     ======================================================= */

  const loadCloud = useCallback(async () => {
    const data = await bootstrap();

    const company = {
      ...companyDefaults,
      ...data.company,
    };

    setCloud({
      company,
      products: data.products,
      customers: data.customers,
      invoices: data.invoices.map(normalizeInvoice),
      ledgerEntries: data.ledgerEntries || [],
      inventoryItems: data.inventoryItems || [],
      inventoryTransactions: data.inventoryTransactions || [],
      production: data.production || [],
      leads: data.leads || [],
      workers: data.workers || [],
      attendance: data.attendance || [],
      serviceProviders: data.serviceProviders || [],
      purchases: data.purchases || [],
      user: data.user,
    });

    setHydrated(true);

    /* -------------------------------------------------------
       Load stamp image if required
       ------------------------------------------------------- */

    try {
      if (company.stampDriveFileId || company.stampImage) {
        const stamp = await getStamp();

        if (stamp?.dataUrl || stamp?.url) {
          const nextCompany = {
            ...company,
            stampImage: stamp.dataUrl || stamp.url,
            stampDriveFileId: stamp.fileId,
            stampDriveFolderId: stamp.folderId,
          };

          setCloud((current) => ({
            ...current,
            company: nextCompany,
          }));
        }
      }
    } catch (_) {
      /* Ignore stamp loading errors */
    }
  }, []);

  /* =======================================================
     INITIAL CLOUD SESSION
     ======================================================= */

  useEffect(() => {
    if (!getToken() || !getCloudUrl()) {
      setHydrated(true);
      return;
    }

    loadCloud().catch((err) => {
      clearCloudSession();

      setError(
        err instanceof Error
          ? err.message
          : "Cloud session expired.",
      );

      setHydrated(true);
    });
  }, [loadCloud]);

  /* =======================================================
     LOGIN SUCCESS
     ======================================================= */

  const onLoggedIn = async (user?: { username: string; role?: "owner" | "employee" }) => {
    setError("");

    try {
      await runBusy(
        "Loading your workspace…",
        loadCloud,
      );

      startTransition(() => {
        setTab(user?.role === "employee" ? "billing" : "dashboard");
      });
    } catch (err) {
      clearCloudSession();

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load cloud data.",
      );
    }
  };

  useEffect(() => {
    if (hydrated && getToken() && getUserRole() === "employee" && !["billing", "inventory", "attendance"].includes(tab)) {
      setTab("billing");
    }
  }, [hydrated, tab]);

  /* =======================================================
     WARM UP COMPONENTS IN IDLE TIME
     ======================================================= */

  useEffect(() => {
    const warm = () => {
      void Promise.all([
        import("@/components/billing/Billing"),
        import("@/components/invoices/Invoices"),
        import("@/components/ledger/Ledger"),
        import("@/components/products/Products"),
        import("@/components/inventory/Inventory"),
        import("@/components/customers/Customers"),
        import("@/components/leads/Leads"),
        import("@/components/attendance/Attendance"),
        import("@/components/settings/Settings"),
      ]);
    };

    const w = window as Window & {
      requestIdleCallback?: (
        cb: () => void,
      ) => number;

      cancelIdleCallback?: (
        id: number,
      ) => void;
    };

    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(warm);

      return () => {
        w.cancelIdleCallback?.(id);
      };
    }

    const id = window.setTimeout(
      warm,
      1200,
    );

    return () => {
      window.clearTimeout(id);
    };
  }, []);

  /* =======================================================
     INVOICE TOTALS
     ======================================================= */

  const totals = useMemo(
    () => calc(invoice),
    [invoice],
  );

  /* =======================================================
     FALLBACK INVOICE NUMBER
     ======================================================= */

  /* =======================================================
     CREATE NEW BILL
     ======================================================= */

  const newBill = () => {
    setInvoice(createInvoice(""));
    startTransition(() => setTab("billing"));
  };

  /* =======================================================
     FIND BILL
     ======================================================= */

  const findBill = (id: string) =>
    cloud.invoices.find(
      (item) => item.id === id,
    );

  /* =======================================================
     OPEN BILL
     ======================================================= */

  const openBill = (id: string) => {
    const existing = findBill(id);

    if (!existing) return;

    setInvoice(
      normalizeInvoice(existing),
    );

    startTransition(() => {
      setTab("billing");
    });
  };

  /* =======================================================
     PREVIEW BILL
     ======================================================= */

  const previewBill = (id: string) => {
    const existing = findBill(id);

    if (!existing) return;

    setPreviewInvoice(
      normalizeInvoice(existing),
    );
  };

  /* =======================================================
     PRINT PREVIEW
     ======================================================= */

  const printPreviewBill = () => {
    if (!previewInvoice) return;

    setInvoice(previewInvoice);

    setPreviewInvoice(null);

    window.setTimeout(async () => {
      const printImages = Array.from(document.querySelectorAll<HTMLImageElement>(`.${styles["print-area"]} img`));
      await Promise.all(printImages.map(async (image) => {
        if (image.complete && image.naturalWidth > 0) return;
        try {
          await new Promise<void>((resolve) => {
            image.addEventListener("load", () => resolve(), { once: true });
            image.addEventListener("error", () => resolve(), { once: true });
            window.setTimeout(resolve, 5000);
          });
        } catch { /* continue printing even if an optional image is unavailable */ }
      }));
      window.print();
    }, 350);
  };

  /* =======================================================
     SAVE BILL
     ======================================================= */

  const saveBill = async () => {
    setError("");
    const enteredInvoiceNo = invoice.meta.invoiceNo.trim();
    if (!enteredInvoiceNo) {
      toast.error("Enter a bill / invoice number before saving.");
      return;
    }
    const duplicateInvoice = cloud.invoices.find(
      (saved) => saved.id !== invoice.id && saved.meta.invoiceNo.trim().toLowerCase() === enteredInvoiceNo.toLowerCase(),
    );
    if (duplicateInvoice) {
      toast.error("This bill / invoice number already exists. Enter a unique number.");
      return;
    }

    try {
      await runBusy(
        "Saving bill…",
        async () => {
          await saveEntity(
            "saveInvoice",
            invoice,
          );
        },
      );

      setCloud((current) => ({
        ...current,

        invoices: [
          ...current.invoices.filter(
            (i) => i.id !== invoice.id,
          ),

          normalizeInvoice(invoice),
        ],
      }));

      startTransition(() => {
        setTab("invoices");
      });

      toast.success(
        `Bill ${invoice.meta.invoiceNo} saved successfully.`,
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to save bill.";

      setError(message);

      toast.error(message);
    }
  };

  /* =======================================================
     DELETE BILL
     ======================================================= */

  const removeBill = async (
    id: string,
  ) => {
    try {
      await runBusy(
        "Deleting bill…",
        async () => {
          await saveEntity(
            "deleteInvoice",
            { id },
          );
        },
      );

      setCloud((current) => ({
        ...current,

        invoices:
          current.invoices.filter(
            (i) => i.id !== id,
          ),
      }));

      toast.success("Bill deleted.");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to delete bill.";

      setError(message);

      toast.error(message);
    }
  };

  /* =======================================================
     SAVE PRODUCT
     ======================================================= */

  const saveProduct = async (
    product: Product,
  ) => {
    const duplicate =
      cloud.products.find(
        (p) =>
          p.id !== product.id &&
          p.name.trim().toLowerCase() ===
            product.name.trim().toLowerCase() &&
          p.hsn.trim().toLowerCase() ===
            product.hsn.trim().toLowerCase(),
      );

    if (duplicate) {
      toast.error(
        "A product with the same name and HSN already exists.",
      );

      throw new Error(
        "Duplicate product.",
      );
    }

    const isUpdate =
      cloud.products.some(
        (p) => p.id === product.id,
      );

    try {
      await runBusy(
        isUpdate
          ? "Updating product…"
          : "Saving product…",
        async () => {
          await saveEntity(
            "saveProduct",
            product,
          );
        },
      );

      setCloud((current) => ({
        ...current,

        products: [
          ...current.products.filter(
            (p) => p.id !== product.id,
          ),

          product,
        ],
      }));

      toast.success(
        isUpdate
          ? "Product updated."
          : "Product saved.",
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to save product.";

      toast.error(message);

      throw err;
    }
  };

  /* =======================================================
     DELETE PRODUCT
     ======================================================= */

  const deleteProduct = async (
    id: string,
  ) => {
    try {
      await runBusy(
        "Deleting product…",
        async () => {
          await saveEntity(
            "deleteProduct",
            { id },
          );
        },
      );

      setCloud((current) => ({
        ...current,

        products:
          current.products.filter(
            (p) => p.id !== id,
          ),
      }));

      toast.success(
        "Product deleted.",
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to delete product.";

      toast.error(message);

      throw err;
    }
  };

  /* =======================================================
     UPDATE INVOICE ITEM
     ======================================================= */

  const updateItem = (
    id: string,
    key: keyof Item,
    value: string,
  ) =>
    setInvoice((current) => ({
      ...current,

      items: current.items.map(
        (item) =>
          item.id === id
            ? {
                ...item,

                [key]:
                  key === "quantity" ||
                  key === "rate" ||
                  key === "gstRate"
                    ? Number(value)
                    : value,
              }
            : item,
      ),
    }));

  /* =======================================================
     CHOOSE PRODUCT FOR INVOICE ITEM
     ======================================================= */

  const chooseProduct = (
    id: string,
    productId: string,
  ) => {
    const product =
      cloud.products.find(
        (item) =>
          item.id === productId,
      );

    if (!product) return;

    setInvoice((current) => ({
      ...current,

      items: current.items.map(
        (item) =>
          item.id === id
            ? {
                ...item,

                productId: product.id,

                description:
                  product.name,

                hsn: product.hsn,

                unit: product.unit,

                rate: product.rate,

                gstRate:
                  product.gstRate,
              }
            : item,
      ),
    }));
  };

  /* =======================================================
     COMPANY FIELD UPDATE
     ======================================================= */

  const companySet = (
    key: keyof CompanySettings,
    value: string,
  ) => {
    setCloud((current) => ({
      ...current,

      company: {
        ...current.company,
        [key]: value,
      },
    }));
  };

  /* =======================================================
     SAVE COMPANY
     ======================================================= */

  const saveCompany = async (
    company: CompanySettings,
  ) => {
    try {
      await runBusy(
        "Saving company settings…",
        async () => {
          await saveEntity(
            "saveCompany",
            company,
          );
        },
      );

      setCloud((current) => ({
        ...current,
        company,
      }));

      toast.success(
        "Company settings updated.",
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to save company settings.";

      setError(message);

      toast.error(message);

      throw err;
    }
  };

  /* =======================================================
     PARTY UPDATE
     ======================================================= */

  const partySet = (
    which:
      | "buyer"
      | "consignee",
    party: Party,
  ) =>
    setInvoice((current) => {
      if (
        which === "consignee" &&
        current.buyerSameAsConsignee
      ) {
        return {
          ...current,

          consignee: party,

          buyer: {
            ...party,
          },
        };
      }

      if (
        which === "buyer" &&
        current.buyerSameAsConsignee
      ) {
        return {
          ...current,

          buyer: party,

          consignee: {
            ...party,
          },
        };
      }

      return {
        ...current,
        [which]: party,
      };
    });

  /* =======================================================
     SAVE CUSTOMER FROM BILLING
     ======================================================= */

  const saveCustomer = async (
    party: Party,
  ) => {
    if (!party.name.trim()) return;

    const existing =
      cloud.customers.find(
        (customer) =>
          customer.name
            .trim()
            .toLowerCase() ===
            party.name
              .trim()
              .toLowerCase() &&
          customer.gstin
            .trim()
            .toLowerCase() ===
            party.gstin
              .trim()
              .toLowerCase(),
      );

    const customer: Customer = {
      ...party,

      id:
        existing?.id ||
        crypto.randomUUID(),
    };

    try {
      await runBusy(
        existing
          ? "Updating customer…"
          : "Saving customer…",
        async () => {
          await saveEntity(
            "saveCustomer",
            customer,
          );
        },
      );

      setCloud((current) => ({
        ...current,

        customers: [
          ...current.customers.filter(
            (c) =>
              c.id !== customer.id,
          ),

          customer,
        ],
      }));

      toast.success(
        existing
          ? "Customer updated."
          : "Customer saved.",
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to save customer.";

      setError(message);

      toast.error(message);
    }
  };

  /* =======================================================
     SAVE CUSTOMER ENTITY
     ======================================================= */

  const saveCustomerEntity =
    async (
      customer: Customer,
    ) => {
      const existing =
        cloud.customers.find(
          (c) =>
            c.id !== customer.id &&
            c.name
              .trim()
              .toLowerCase() ===
              customer.name
                .trim()
                .toLowerCase() &&
            c.gstin
              .trim()
              .toLowerCase() ===
              customer.gstin
                .trim()
                .toLowerCase(),
        );

      if (existing) {
        toast.error(
          "A customer with the same name and GSTIN already exists.",
        );

        throw new Error(
          "Duplicate customer.",
        );
      }

      const isUpdate =
        cloud.customers.some(
          (c) => c.id === customer.id,
        );

      try {
        await runBusy(
          isUpdate
            ? "Updating customer…"
            : "Saving customer…",
          async () => {
            await saveEntity(
              "saveCustomer",
              customer,
            );
          },
        );

        setCloud((current) => ({
          ...current,

          customers: [
            ...current.customers.filter(
              (c) =>
                c.id !== customer.id,
            ),

            customer,
          ],
        }));

        toast.success(
          isUpdate
            ? "Customer updated."
            : "Customer saved.",
        );
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Unable to save customer.";

        toast.error(message);

        throw err;
      }
    };

  /* =======================================================
     DELETE CUSTOMER
     ======================================================= */

  const deleteCustomer = async (
    id: string,
  ) => {
    try {
      await runBusy(
        "Deleting customer…",
        async () => {
          await saveEntity(
            "deleteCustomer",
            { id },
          );
        },
      );

      setCloud((current) => ({
        ...current,

        customers:
          current.customers.filter(
            (c) => c.id !== id,
          ),
      }));

      toast.success(
        "Customer deleted.",
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to delete customer.";

      toast.error(message);

      throw err;
    }
  };

  /* =======================================================
     USE CUSTOMER IN NEW BILL
     ======================================================= */

  const useCustomerInFreshBill =
    async (
      customer: Customer,
    ) => {
      const fresh = createInvoice("");

      setInvoice({
        ...fresh,

        consignee: {
          ...customer,
        },

        buyer: emptyParty(),

        buyerSameAsConsignee:
          false,
      });

      startTransition(() => {
        setTab("billing");
      });
    };

  /* =======================================================
     INVENTORY
     ======================================================= */

  const saveInventoryItem = async (item: InventoryItem) => {
    const duplicate = cloud.inventoryItems.find(
      (x) => x.id !== item.id &&
        x.name.trim().toLowerCase() === item.name.trim().toLowerCase() &&
        x.type === item.type
    );
    if (duplicate) { toast.error("This inventory material/product already exists."); throw new Error("Duplicate inventory item."); }
    const isUpdate = cloud.inventoryItems.some(x => x.id === item.id);
    try {
      await runBusy(isUpdate ? "Updating inventory master…" : "Saving inventory master…", async () => {
        await saveEntity("saveInventoryItem", item);
      });
      setCloud(current => ({
        ...current,
        inventoryItems: [...current.inventoryItems.filter(x => x.id !== item.id), item],
      }));
      toast.success(isUpdate ? "Inventory master updated." : "Inventory material saved.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to save inventory material.";
      toast.error(message); throw err;
    }
  };

  const deleteInventoryItem = async (id: string) => {
    if (cloud.inventoryTransactions.some(t => t.itemId === id)) {
      toast.error("This material has stock history. Keep it for audit and mark it inactive instead.");
      throw new Error("Inventory item has transaction history.");
    }
    try {
      await runBusy("Deleting inventory material…", async () => saveEntity("deleteInventoryItem", { id }));
      setCloud(current => ({ ...current, inventoryItems: current.inventoryItems.filter(x => x.id !== id) }));
      toast.success("Inventory material deleted.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to delete inventory material.";
      toast.error(message); throw err;
    }
  };

  const saveInventoryTransaction = async (tx: InventoryTransaction) => {
    try {
      const result = await runBusy("Updating stock…", async () =>
        saveEntity("saveInventoryTransaction", tx)
      );
      const saved = (result as { transaction?: InventoryTransaction }).transaction || tx;
      setCloud(current => ({
        ...current,
        inventoryTransactions: [...current.inventoryTransactions.filter(x => x.id !== saved.id), saved],
      }));
      toast.success(`${saved.transactionType} stock movement saved.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to save stock movement.";
      toast.error(message); throw err;
    }
  };

  const saveProduction = async (production: ProductionRecord) => {
    try {
      const result = await runBusy("Saving production and updating stock…", async () =>
        saveEntity("saveProduction", production)
      );
      const saved = (result as { production?: ProductionRecord }).production || production;
      const output = cloud.inventoryItems.find(x => x.id === saved.outputItemId);
      const newTx: InventoryTransaction[] = [
        {
          id: crypto.randomUUID(), date: saved.date, itemId: saved.outputItemId,
          itemName: saved.outputItemName, itemType: "FINISHED_PRODUCT", transactionType: "IN",
          quantity: saved.outputQuantity, unit: saved.unit, rate: output?.costRate || 0,
          referenceNo: saved.referenceNo || saved.id, source: "Production", party: "",
          batchNo: saved.batchNo, location: output?.location || "", notes: "Production output",
          createdAt: saved.createdAt,
        },
        ...saved.rawMaterials.map(r => {
          const item = cloud.inventoryItems.find(x => x.id === r.itemId);
          return {
            id: crypto.randomUUID(), date: saved.date, itemId: r.itemId, itemName: r.itemName,
            itemType: "RAW_MATERIAL" as const, transactionType: "OUT" as const,
            quantity: r.quantity, unit: r.unit, rate: item?.costRate || 0,
            referenceNo: saved.referenceNo || saved.id, source: "Production Consumption",
            party: "", batchNo: saved.batchNo, location: item?.location || "",
            notes: "Consumed for " + saved.outputItemName, createdAt: saved.createdAt,
          };
        }),
      ];
      setCloud(current => ({ ...current, production: [...current.production, saved], inventoryTransactions: [...current.inventoryTransactions, ...newTx] }));
      toast.success("Production saved and stock updated.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to save production.";
      toast.error(message); throw err;
    }
  };

  /* =======================================================
     SAVE LEDGER ENTRY
     ======================================================= */

  const saveLedgerEntry =
    async (
      entry: LedgerEntry,
    ) => {
      try {
        await runBusy(
          "Saving ledger receipt…",
          async () => {
            await saveEntity(
              "saveLedgerEntry",
              entry,
            );
          },
        );

        setCloud((current) => ({
          ...current,

          ledgerEntries: [
            ...current.ledgerEntries.filter(
              (e) => e.id !== entry.id,
            ),

            entry,
          ],
        }));

        toast.success(
          "Ledger receipt saved.",
        );
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Unable to save ledger entry.";

        setError(message);

        toast.error(message);

        throw err;
      }
    };

  /* =======================================================
     DELETE LEDGER ENTRY
     ======================================================= */

  const deleteLedgerEntry =
    async (
      id: string,
    ) => {
      try {
        await runBusy(
          "Deleting ledger receipt…",
          async () => {
            await saveEntity(
              "deleteLedgerEntry",
              { id },
            );
          },
        );

        setCloud((current) => ({
          ...current,

          ledgerEntries:
            current.ledgerEntries.filter(
              (e) => e.id !== id,
            ),
        }));

        toast.success(
          "Ledger receipt deleted.",
        );
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Unable to delete ledger entry.";

        setError(message);

        toast.error(message);

        throw err;
      }
    };

  /* =======================================================
     ATTENDANCE
     ======================================================= */

  const saveWorker = async (worker: Worker) => {
    const duplicate = cloud.workers.find(
      (x) =>
        x.id !== worker.id &&
        x.name.trim().toLowerCase() === worker.name.trim().toLowerCase() &&
        x.phone.trim() === worker.phone.trim(),
    );
    if (duplicate) {
      toast.error("This worker/staff member already exists.");
      throw new Error("Duplicate worker.");
    }

    const isUpdate = cloud.workers.some((x) => x.id === worker.id);
    try {
      await runBusy(
        isUpdate ? "Updating worker…" : "Saving worker…",
        async () => saveEntity("saveWorker", worker),
      );
      setCloud((current) => ({
        ...current,
        workers: [
          ...current.workers.filter((x) => x.id !== worker.id),
          worker,
        ],
      }));
      toast.success(isUpdate ? "Worker updated." : "Worker added.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to save worker.";
      toast.error(message);
      throw err;
    }
  };

  const deleteWorker = async (id: string) => {
    if (cloud.attendance.some((x) => x.workerId === id)) {
      toast.error("This worker has attendance history. Mark them inactive instead of deleting.");
      throw new Error("Worker has attendance history.");
    }
    try {
      await runBusy("Deleting worker…", async () => saveEntity("deleteWorker", { id }));
      setCloud((current) => ({
        ...current,
        workers: current.workers.filter((x) => x.id !== id),
      }));
      toast.success("Worker deleted.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to delete worker.";
      toast.error(message);
      throw err;
    }
  };

  const saveAttendance = async (record: AttendanceRecord) => {
    const duplicate = cloud.attendance.find(
      (x) =>
        x.id !== record.id &&
        x.workerId === record.workerId &&
        x.date === record.date,
    );
    if (duplicate) {
      toast.error("Attendance is already marked for this worker on this date.");
      throw new Error("Duplicate attendance.");
    }

    const isUpdate = cloud.attendance.some((x) => x.id === record.id);
    try {
      const result = await runBusy(
        isUpdate ? "Updating attendance…" : "Saving attendance…",
        async () => saveEntity("saveAttendance", record),
      );
      const saved = (result as { attendance?: AttendanceRecord }).attendance || record;
      setCloud((current) => ({
        ...current,
        attendance: [
          ...current.attendance.filter((x) => x.id !== saved.id),
          saved,
        ],
      }));
      toast.success(isUpdate ? "Attendance updated." : "Attendance saved.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to save attendance.";
      toast.error(message);
      throw err;
    }
  };

  const deleteAttendance = async (id: string) => {
    try {
      await runBusy("Deleting attendance…", async () => saveEntity("deleteAttendance", { id }));
      setCloud((current) => ({
        ...current,
        attendance: current.attendance.filter((x) => x.id !== id),
      }));
      toast.success("Attendance record deleted.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to delete attendance.";
      toast.error(message);
      throw err;
    }
  };

  /* =======================================================
     LEADS / MARKETING
     ======================================================= */

  const saveLead = async (lead: Lead) => {
    const duplicate = cloud.leads.find(
      (x) =>
        x.id !== lead.id &&
        x.customerName.trim().toLowerCase() === lead.customerName.trim().toLowerCase() &&
        x.phone.trim() &&
        lead.phone.trim() &&
        x.phone.trim() === lead.phone.trim() &&
        x.leadDate === lead.leadDate,
    );

    if (duplicate) {
      toast.error("A lead with the same customer, phone and date already exists.");
      throw new Error("Duplicate lead.");
    }

    const isUpdate = cloud.leads.some((x) => x.id === lead.id);

    try {
      await runBusy(
        isUpdate ? "Updating lead…" : "Saving lead…",
        async () => saveEntity("saveLead", lead),
      );

      setCloud((current) => ({
        ...current,
        leads: [
          ...current.leads.filter((x) => x.id !== lead.id),
          lead,
        ],
      }));

      toast.success(isUpdate ? "Lead updated." : "Lead saved.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to save lead.";
      toast.error(message);
      throw err;
    }
  };

  const deleteLead = async (id: string) => {
    try {
      await runBusy("Deleting lead…", async () => saveEntity("deleteLead", { id }));
      setCloud((current) => ({
        ...current,
        leads: current.leads.filter((x) => x.id !== id),
      }));
      toast.success("Lead deleted.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to delete lead.";
      toast.error(message);
      throw err;
    }
  };

  const saveServiceProvider = async (provider: ServiceProvider) => {
    const duplicate = cloud.serviceProviders.find((x) => x.id !== provider.id && x.name.trim().toLowerCase() === provider.name.trim().toLowerCase() && x.phone.trim() === provider.phone.trim());
    if (duplicate) { toast.error("A provider with the same name and phone already exists."); throw new Error("Duplicate service provider."); }
    const isUpdate = cloud.serviceProviders.some((x) => x.id === provider.id);
    await runBusy(isUpdate ? "Updating provider…" : "Saving provider…", async () => saveEntity("saveServiceProvider", provider));
    setCloud((current) => ({ ...current, serviceProviders: [...current.serviceProviders.filter((x) => x.id !== provider.id), provider] }));
    toast.success(isUpdate ? "Service provider updated." : "Service provider saved.");
  };

  const deleteServiceProvider = async (id: string) => {
    if (!window.confirm("Delete this service provider?")) return;
    try {
      await runBusy("Deleting provider…", async () => saveEntity("deleteServiceProvider", { id }));
      setCloud((current) => ({ ...current, serviceProviders: current.serviceProviders.filter((x) => x.id !== id) }));
      toast.success("Service provider deleted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to delete service provider.");
    }
  };

  const savePurchase = async (purchase: PurchaseRecord) => {
    if (!purchase.itemName.trim()) throw new Error("Purchase item name is required.");
    if (!purchase.supplierName.trim()) throw new Error("Supplier name is required.");
    const totalAmount = Math.max(0, Number(purchase.quantity) || 0) * Math.max(0, Number(purchase.unitPrice) || 0);
    const next = { ...purchase, totalAmount, updatedAt: new Date().toISOString() };
    const isUpdate = cloud.purchases.some((x) => x.id === next.id);
    await runBusy(isUpdate ? "Updating purchase…" : "Saving purchase…", async () => saveEntity("savePurchase", next));
    setCloud((current) => ({ ...current, purchases: [...current.purchases.filter((x) => x.id !== next.id), next] }));
    toast.success(isUpdate ? "Purchase updated." : "Purchase saved.");
  };

  const deletePurchase = async (id: string) => {
    if (!window.confirm("Delete this purchase record? This cannot be undone.")) return;
    try {
      await runBusy("Deleting purchase…", async () => saveEntity("deletePurchase", { id }));
      setCloud((current) => ({ ...current, purchases: current.purchases.filter((x) => x.id !== id) }));
      toast.success("Purchase record deleted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to delete purchase record.");
    }
  };

  /* =======================================================
     LOGOUT
     ======================================================= */

  const logout = () => {
    clearCloudSession();

    setHydrated(false);

    setCloud(emptyCloud);

    setInvoice(
      createInvoice(),
    );

    setError("");

    setHydrated(true);
  };

  /* =======================================================
     INITIAL LOADING SCREEN
     ======================================================= */

  if (!hydrated) {
    return (
      <AppLoader
        label="Loading Deal Magsil…"
      />
    );
  }

  /* =======================================================
     LOGIN SCREEN
     ======================================================= */

  if (!getToken()) {
    return (
      <>
        <Login
          onLoggedIn={onLoggedIn}
        />

        {error && (
          <div
            className={
              styles[
                "login-error-banner"
              ]
            }
          >
            {error}
          </div>
        )}
      </>
    );
  }

  /* =======================================================
     MAIN APPLICATION
     ======================================================= */

  return (
    <main>
      {/* ===================================================
          TOASTER
          =================================================== */}

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
        }}
      />

      {/* ===================================================
          GLOBAL BUSY LOADER
          =================================================== */}

      {busy && (
        <AppLoader
          label={busyLabel}
          overlay
        />
      )}

      {/* Responsive app shell: collapsible sidebar + workspace */}
      <div className={`${styles.appShell} ${sidebarCollapsed ? styles.sidebarCollapsed : ""}`}>
        {mobileSidebarOpen && <button aria-label="Close navigation" className={styles.mobileBackdrop} onClick={() => setMobileSidebarOpen(false)} />}
        <aside className={`${styles.sidebar} ${mobileSidebarOpen ? styles.sidebarMobileOpen : ""}`}>
          <div className={styles.sidebarBrand}>
            <div className={styles.brandMark}>DM</div>
            <div className={styles.brandText}><strong>DEAL MAGSIL</strong><small>BUSINESS MANAGER</small></div>
            <button className={styles.sidebarClose} aria-label="Close navigation" onClick={() => setMobileSidebarOpen(false)}>×</button>
          </div>
          <div className={styles.companyLabel}><span className={styles.companyAvatar}>D</span><span className={styles.companyName}>Deal Magsil</span><span className={styles.companyChevron}>⌄</span></div>
          <div className={styles.navCaption}>WORKSPACE</div>
          <nav className={styles.sideNav} aria-label="Main navigation">
            {([ ["dashboard", "Dashboard", "⌂"], ["billing", "New Bill", "+"], ["invoices", `Bills (${cloud.invoices.length})`, "▤"], ["debtors", "Debtors", "◷"], ["products", "Products", "◇"], ["inventory", "Inventory", "▦"], ["customers", "Customers", "♙"], ["leads", "Leads", "↗"], ["attendance", "Attendance", "✓"], ["providers", "Service Providers", "♧"], ["purchases", "Purchases", "▣"], ["settings", "Company Settings", "⚙"] ] as [string, string, string][])
              .filter(([key]) => getUserRole() === "owner" ? true : ["dashboard", "inventory", "attendance"].includes(key))
              .map(([key, label, glyph]) => <button key={key} className={`${styles.navItem} ${tab === key ? styles.navItemActive : ""}`} disabled={busy} title={sidebarCollapsed ? label : undefined} onClick={() => { startTransition(() => setTab(key as Tab)); setMobileSidebarOpen(false); }}><span className={styles.navIcon} aria-hidden="true">{glyph}</span><span className={styles.navLabel}>{label}</span>{tab === key && <span className={styles.activeMarker} />}</button>)}
          </nav>
          <div className={styles.sidebarBottom}>
            <div className={styles.helpCard}><span className={styles.helpIcon}>?</span><div className={styles.helpText}><strong>Need help?</strong><small>Manage your business easily</small></div></div>
            <button className={`${styles.navItem} ${styles.logoutItem}`} disabled={busy} onClick={logout}><span className={styles.navIcon}>↪</span><span className={styles.navLabel}>Log out</span></button>
            <button className={styles.collapseButton} onClick={() => setSidebarCollapsed(v => !v)} aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}><span>{sidebarCollapsed ? "›" : "‹"}</span><span className={styles.navLabel}>{sidebarCollapsed ? "Expand menu" : "Collapse menu"}</span></button>
          </div>
        </aside>
        <div className={styles.workspace}>
          <header className={styles.topbar}>
            <div className={styles.topbarLeft}><button className={styles.mobileMenuButton} aria-label="Open navigation" onClick={() => setMobileSidebarOpen(true)}>☰</button><div><div className={styles.pageEyebrow}>DEAL MAGSIL / WORKSPACE</div><h1 className={styles.pageTitle}>{({ dashboard: "Dashboard", billing: "Create new bill", invoices: "Bills & invoices", debtors: "Debtors & collections", ledger: "Ledger", products: "Products", inventory: "Inventory", customers: "Customers", leads: "Leads", attendance: "Attendance", providers: "Service providers", purchases: "Purchases", settings: "Company settings" } as Record<string, string>)[tab] || "Dashboard"}</h1></div></div>
            <div className={styles.topbarRight}><span className={styles.statusDot} /><span className={styles.statusText}>Workspace ready</span><div className={styles.userAvatar}>{(cloud.user?.username || "D").slice(0, 1).toUpperCase()}</div><div className={styles.userMeta}><strong>{cloud.user?.username || "Deal Magsil"}</strong><small>{getUserRole() === "owner" ? "Owner account" : "Staff account"}</small></div></div>
          </header>
      {/* ===================================================
          ERROR BANNER
          =================================================== */}

      {error && (
        <div
          className={
            styles["error-banner"]
          }
        >
          {error}

          <button
            onClick={() =>
              setError("")
            }
          >
            ×
          </button>
        </div>
      )}

      {/* ===================================================
          DASHBOARD
          =================================================== */}

      {tab === "dashboard" && (
        <Dashboard
          saved={cloud.invoices}
          products={cloud.products}
          ledgerEntries={
            cloud.ledgerEntries
          }
          inventoryItems={cloud.inventoryItems}
          inventoryTransactions={cloud.inventoryTransactions}
          productions={cloud.production}
          leads={cloud.leads}
          workers={cloud.workers}
          attendance={cloud.attendance}
          purchases={cloud.purchases}
          onNew={newBill}
          onOpen={openBill}
          onViewDebtors={() => setTab("debtors")}
        />
      )}

      {/* ===================================================
          DEBTORS & COLLECTIONS
          =================================================== */}

      {tab === "debtors" && getUserRole() === "owner" && (
        <Debtors
          invoices={cloud.invoices}
          customers={cloud.customers}
          entries={cloud.ledgerEntries}
          onSaveEntry={saveLedgerEntry}
        />
      )}

      {/* ===================================================
          BILLING
          =================================================== */}

      {tab === "billing" && (
        <Billing
          invoice={invoice}
          setInvoice={setInvoice}
          products={cloud.products}
          totals={totals}
          company={cloud.company}
          onNew={newBill}
          onSave={saveBill}
          onPrint={async () => {
            const images = Array.from(document.querySelectorAll<HTMLImageElement>(`.${styles["print-area"]} img`));
            await Promise.all(images.map((image) => image.decode?.().catch(() => undefined)));
            window.print();
          }}
          updateItem={updateItem}
          chooseProduct={
            chooseProduct
          }
          partySet={partySet}
          saveCustomer={
            saveCustomer
          }
        />
      )}

      {/* ===================================================
          INVOICES
          =================================================== */}

      {tab === "invoices" && (
        <Invoices
          saved={cloud.invoices}
          search={search}
          setSearch={setSearch}
          onNew={newBill}
          onOpen={openBill}
          onPreview={
            previewBill
          }
          onDelete={
            removeBill
          }
        />
      )}

      {/* ===================================================
          LEDGER
          =================================================== */}

      {tab === "ledger" && (
        <Ledger
          invoices={
            cloud.invoices
          }
          customers={
            cloud.customers
          }
          entries={
            cloud.ledgerEntries
          }
          onSaveEntry={
            saveLedgerEntry
          }
          onDeleteEntry={
            deleteLedgerEntry
          }
          onOpenInvoice={
            openBill
          }
        />
      )}

      {/* ===================================================
          PRODUCTS
          =================================================== */}

      {tab === "products" && (
        <Products
          products={
            cloud.products
          }
          onSave={
            saveProduct
          }
          onDelete={
            deleteProduct
          }
        />
      )}

      {/* ===================================================
          INVENTORY
          =================================================== */}

      {tab === "inventory" && (
        <Inventory
          items={cloud.inventoryItems}
          transactions={cloud.inventoryTransactions}
          productions={cloud.production}
          products={cloud.products}
          onSaveItem={saveInventoryItem}
          onDeleteItem={deleteInventoryItem}
          onSaveTransaction={saveInventoryTransaction}
          onSaveProduction={saveProduction}
        />
      )}

      {/* ===================================================
          LEADS / MARKETING
          =================================================== */}

      {tab === "leads" && (
        <Leads
          leads={cloud.leads}
          onSave={saveLead}
          onDelete={deleteLead}
        />
      )}

      {/* ===================================================
          CUSTOMERS
          =================================================== */}

      {tab === "customers" && (
        <Customers
          customers={
            cloud.customers
          }
          onSave={
            saveCustomerEntity
          }
          onDelete={
            deleteCustomer
          }
          onUse={
            useCustomerInFreshBill
          }
          company={cloud.company}
          onCompanySave={saveCompany}
          isOwner={getUserRole() === "owner"}
        />
      )}

      {tab === "attendance" && (
        <Attendance
          workers={cloud.workers}
          records={cloud.attendance}
          onSaveWorker={saveWorker}
          onDeleteWorker={deleteWorker}
          onSaveAttendance={saveAttendance}
          onDeleteAttendance={deleteAttendance}
        />
      )}

      {tab === "providers" && getUserRole() === "owner" && <ServiceProviders providers={cloud.serviceProviders} onSave={saveServiceProvider} onDelete={deleteServiceProvider} />}
      {tab === "purchases" && getUserRole() === "owner" && <Purchases purchases={cloud.purchases} onSave={savePurchase} onDelete={deletePurchase} />}

      {/* ===================================================
          SETTINGS
          =================================================== */}

      {tab === "settings" && (
        <Settings
          company={
            cloud.company
          }
          exportData={cloud}
          set={companySet}
          onSave={
            saveCompany
          }
          username={
            cloud.user.username
          }
          onPasswordChanged={() => {}}
        />
      )}

      {/* ===================================================
          PRINT AREA
          =================================================== */}

      <div
        className={
          styles["print-area"]
        }
      >
        <InvoicePreview
          invoice={invoice}
          company={
            cloud.company
          }

          totals={totals}
        />
      </div>

      {/* ===================================================
          BILL PREVIEW MODAL
          =================================================== */}

      {previewInvoice && (
        <BillPreviewModal
          invoice={
            previewInvoice
          }
          company={
            cloud.company
          }

          onClose={() =>
            setPreviewInvoice(
              null,
            )
          }
          onPrint={
            printPreviewBill
          }
        />
      )}
        </div>
      </div>
    </main>
  );
}