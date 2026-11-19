export type CloudPayload = {
  company: import("@/types").CompanySettings;
  products: import("@/types").Product[];
  customers: import("@/types").Customer[];
  invoices: import("@/types").Invoice[];
  ledgerEntries: import("@/types").LedgerEntry[];
  inventoryItems: import("@/types").InventoryItem[];
  inventoryTransactions: import("@/types").InventoryTransaction[];
  production: import("@/types").ProductionRecord[];
  leads: import("@/types").Lead[];
  workers: import("@/types").Worker[];
  attendance: import("@/types").AttendanceRecord[];
  serviceProviders: import("@/types").ServiceProvider[];
  purchases: import("@/types").PurchaseRecord[];
  user: { username: string };
};

const SESSION_TOKEN = "deal-magsil-cloud-token";
const SESSION_URL = "deal-magsil-cloud-url";
const SESSION_ROLE = "deal-magsil-user-role";

export type UserRole = "owner" | "employee";

export function getUserRole(): UserRole {
  if (typeof window === "undefined") return "owner";
  return (sessionStorage.getItem(SESSION_ROLE) || localStorage.getItem(SESSION_ROLE)) === "employee" ? "employee" : "owner";
}

export function getCloudUrl(): string {
  if (typeof window === "undefined") return "";

  return (
    localStorage.getItem(SESSION_URL) ||
    sessionStorage.getItem(SESSION_URL) ||
    ""
  );
}

export function setCloudUrl(url: string): void {
  if (typeof window === "undefined") return;

  const value = url.trim();

  localStorage.setItem(SESSION_URL, value);
  sessionStorage.setItem(SESSION_URL, value);
}

export function getToken(): string {
  if (typeof window === "undefined") return "";

  return (
    localStorage.getItem(SESSION_TOKEN) ||
    sessionStorage.getItem(SESSION_TOKEN) ||
    ""
  );
}

function setToken(token: string): void {
  if (typeof window === "undefined") return;

  localStorage.setItem(SESSION_TOKEN, token);
  sessionStorage.setItem(SESSION_TOKEN, token);
}

export function clearCloudSession(): void {
  if (typeof window === "undefined") return;

  localStorage.removeItem(SESSION_TOKEN);
  localStorage.removeItem(SESSION_URL);
  localStorage.removeItem(SESSION_ROLE);
  sessionStorage.removeItem(SESSION_ROLE);
  sessionStorage.removeItem(SESSION_TOKEN);
  sessionStorage.removeItem(SESSION_URL);
}

function isSessionExpiredError(error?: string): boolean {
  const message = String(error || "").toLowerCase();

  return (
    message.includes("session_expired") ||
    message.includes("session expired") ||
    message.includes("not signed in")
  );
}

function encode(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function jsonp<T>(
  url: string,
  params: Record<string, string>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!url) {
      reject(new Error("Google Sheets Web App URL is not configured."));
      return;
    }

    const callback = `dm_jsonp_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}`;

    const script = document.createElement("script");
    const query = new URLSearchParams({ ...params, callback });

    let timer: number | undefined;

    let finished = false;

    const removeCallback = () => {
      delete (window as unknown as Record<string, unknown>)[callback];
      script.remove();
    };

    const cleanup = () => {
      if (timer) window.clearTimeout(timer);
      removeCallback();
    };

    (window as unknown as Record<string, unknown>)[callback] = (
      result: T,
    ) => {
      if (finished) return;
      finished = true;
      cleanup();
      resolve(result);
    };

    script.onerror = () => {
      if (finished) return;
      finished = true;
      cleanup();
      reject(new Error("Unable to reach Google Sheets Web App."));
    };

    script.src = `${url.replace(/\/$/, "")}?${query.toString()}`;
    document.body.appendChild(script);

    timer = window.setTimeout(() => {
      if (finished) return;
      finished = true;

      // Keep a harmless callback temporarily so a very late Google Apps
      // Script response cannot execute an undefined dm_jsonp_* function.
      (window as unknown as Record<string, unknown>)[callback] = () => {
        removeCallback();
      };

      script.remove();
      reject(new Error("Google Sheets request timed out. Please check the Web App URL and deployment."));

      window.setTimeout(() => {
        removeCallback();
      }, 120000);
    }, 60000);
  });
}

export async function login(
  url: string,
  username: string,
  password: string,
) {
  const cleanUrl = url.trim();

  if (!cleanUrl) {
    throw new Error("Google Apps Script Web App URL is required.");
  }

  if (!cleanUrl.includes("/exec")) {
    throw new Error(
      "Please use the deployed Google Apps Script Web App URL ending with /exec.",
    );
  }

  setCloudUrl(cleanUrl);

  const passwordHash = await sha256(password);

  const result = await jsonp<{
    ok: boolean;
    token?: string;
    user?: { username: string; role?: UserRole };
    error?: string;
  }>(cleanUrl, {
    action: "login",
    username: username.trim(),
    passwordHash,
  });

  if (!result.ok || !result.token) {
    throw new Error(
      result.error || "Invalid username or password.",
    );
  }

  setToken(result.token);
  const role: UserRole = result.user?.role === "employee" ? "employee" : "owner";
  localStorage.setItem(SESSION_ROLE, role);
  sessionStorage.setItem(SESSION_ROLE, role);

  return { ...(result.user || { username: username.trim() }), role };
}

export async function nextInvoiceNumber(
  url = getCloudUrl(),
): Promise<string> {
  const token = getToken();

  if (!token) {
    clearCloudSession();
    throw new Error("SESSION_EXPIRED");
  }

  const result = await jsonp<{
    ok: boolean;
    invoiceNo?: string;
    error?: string;
  }>(url, {
    action: "nextInvoiceNumber",
    token,
  });

  if (!result.ok || !result.invoiceNo) {
    if (isSessionExpiredError(result.error)) {
      clearCloudSession();
    }

    throw new Error(
      result.error || "Unable to generate invoice number.",
    );
  }

  return result.invoiceNo;
}

export async function bootstrap(
  url = getCloudUrl(),
): Promise<CloudPayload> {
  const cleanUrl = url.trim();
  const token = getToken();

  if (!cleanUrl) {
    throw new Error("Google Sheets Web App URL is not configured.");
  }

  if (!token) {
    clearCloudSession();
    throw new Error("SESSION_EXPIRED");
  }

  const result = await jsonp<{
    ok: boolean;
    data?: CloudPayload;
    error?: string;
  }>(cleanUrl, {
    action: "bootstrap",
    token,
  });

  if (!result.ok || !result.data) {
    if (isSessionExpiredError(result.error)) {
      clearCloudSession();
    }

    throw new Error(
      result.error || "Unable to load cloud data.",
    );
  }

  return result.data;
}

/**
 * Apps Script Web Apps do not expose permissive CORS headers for
 * browser POSTs. We therefore send a no-cors POST and then poll
 * mutationStatus through JSONP GET.
 */
export async function postCloud<T = Record<string, unknown>>(
  action: string,
  payload: Record<string, unknown>,
  url = getCloudUrl(),
): Promise<T> {
  const cleanUrl = url.trim();
  const token = getToken();

  if (!cleanUrl) {
    throw new Error("Google Sheets Web App URL is not configured.");
  }

  if (!token) {
    clearCloudSession();
    throw new Error("SESSION_EXPIRED");
  }

  const requestId = `req_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2)}`;

  const body = new URLSearchParams({
    action,
    token,
    requestId,
    payload: encode(payload),
  });

  try {
    await fetch(cleanUrl, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body,
    });
  } catch {
    throw new Error("Unable to reach Google Sheets Web App.");
  }

  const started = Date.now();

  while (Date.now() - started < 20000) {
    try {
      const result = await jsonp<{
        ok: boolean;
        pending?: boolean;
        result?: T;
        error?: string;
      }>(cleanUrl, {
        action: "mutationStatus",
        token: getToken(),
        requestId,
      });

      if (result.ok) {
        return (result.result || {}) as T;
      }

      if (
        result.error &&
        result.error !== "Mutation is still processing."
      ) {
        if (isSessionExpiredError(result.error)) {
          clearCloudSession();
        }

        throw new Error(result.error);
      }
    } catch (error) {
      if (error instanceof Error) {
        if (isSessionExpiredError(error.message)) {
          clearCloudSession();
          throw error;
        }

        if (
          !/Mutation is still processing/i.test(error.message)
        ) {
          throw error;
        }
      }
    }

    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 350);
    });
  }

  throw new Error(
    "Google Sheets save timed out. Please check your Apps Script deployment.",
  );
}

export async function saveEntity(
  action:
    | "saveCompany"
    | "saveProduct"
    | "saveCustomer"
    | "saveInvoice"
    | "deleteProduct"
    | "deleteCustomer"
    | "deleteInvoice"
    | "saveLedgerEntry"
    | "deleteLedgerEntry"
    | "saveInventoryItem"
    | "deleteInventoryItem"
    | "saveInventoryTransaction"
    | "saveProduction"
    | "saveLead"
    | "deleteLead"
    | "saveWorker"
    | "deleteWorker"
    | "saveAttendance"
    | "deleteAttendance"
    | "saveServiceProvider"
    | "deleteServiceProvider"
    | "savePurchase"
    | "deletePurchase",
  entity: unknown,
) {
  return postCloud(action, { entity });
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
) {
  await postCloud("changePassword", {
    currentPasswordHash: await sha256(currentPassword),
    newPasswordHash: await sha256(newPassword),
  });
}

export async function getStamp(
  url = getCloudUrl(),
) {
  const token = getToken();

  if (!token) {
    clearCloudSession();
    throw new Error("SESSION_EXPIRED");
  }

  const result = await jsonp<{
    ok: boolean;
    stamp?: {
      fileId: string;
      folderId: string;
      url: string;
      dataUrl?: string;
    };
    error?: string;
  }>(url, {
    action: "stamp",
    token,
  });

  if (!result.ok) {
    if (isSessionExpiredError(result.error)) {
      clearCloudSession();
    }

    throw new Error(
      result.error || "Unable to load company stamp.",
    );
  }

  return result.stamp || null;
}


export async function downloadSheetWorkbook(): Promise<{ base64: string; fileName: string }> {
  if (getUserRole() !== "owner") throw new Error("Only the owner can export the full workbook.");
  const result = await jsonp<{ ok: boolean; base64?: string; fileName?: string; error?: string }>(
    getCloudUrl(),
    { action: "exportWorkbook", token: getToken() },
  );
  if (!result.ok || !result.base64) throw new Error(result.error || "Google Sheets export returned no workbook data.");
  return { base64: result.base64, fileName: result.fileName || "Deal-Magsil-Workbook.xlsx" };
}


export type CloudBackup = {
  fileId: string;
  name: string;
  createdAt: string;
  kind: "daily" | "manual" | "pre-restore" | string;
  size: number;
  verified: boolean;
};

export async function listCloudBackups(): Promise<CloudBackup[]> {
  if (getUserRole() !== "owner") throw new Error("Only the owner can access backups.");
  const result = await jsonp<{ ok: boolean; backups?: CloudBackup[]; error?: string }>(
    getCloudUrl(),
    { action: "listBackups", token: getToken() },
  );
  if (!result.ok) throw new Error(result.error || "Unable to list backups.");
  return result.backups || [];
}

export async function createCloudBackup(): Promise<{
  ok: boolean; fileId: string; name: string; createdAt: string;
  kind: string; sheetCount: number; verified: boolean;
}> {
  if (getUserRole() !== "owner") throw new Error("Only the owner can create backups.");
  return postCloud("backupNow", {});
}

export async function restoreCloudBackup(fileId: string): Promise<{
  ok: boolean; restored: boolean; backupName: string; restoredAt: string;
  verified: boolean; safetyBackup: string; sheetCount: number;
}> {
  if (getUserRole() !== "owner") throw new Error("Only the owner can restore backups.");
  if (!fileId.trim()) throw new Error("Select a backup to restore.");
  return postCloud("restoreBackup", { fileId });
}
