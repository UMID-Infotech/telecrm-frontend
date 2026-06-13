// teleCRM/app/admin/leads/create/page.tsx
"use client";

import { useState, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import {
  Plus,
  Trash2,
  Upload,
  FileText,
  FileSpreadsheet,
  File,
  Link,
  X,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";

// ─── Types ───────────────────────────────────────────────────

type FieldType = "TEXT" | "NUMBER" | "BOOLEAN" | "DATE" | "DROPDOWN";
type Priority = "HIGH" | "MEDIUM" | "LOW";
type TabMode = "single" | "bulk";
type BulkInputMode = "file" | "google";

interface DynamicField {
  id: string;
  key: string;
  type: FieldType;
  value: any;
  dropdownOptions?: string;
}

interface BulkLeadRow {
  rowIndex: number;
  name: string;
  phone: string;
  priority: Priority;
  data: Record<string, any>;
  status: "pending" | "success" | "error";
  error?: string;
}

// ─── Google Sheets URL parser ─────────────────────────────────

function extractSheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

function buildSheetsExportUrl(sheetId: string): string {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&id=${sheetId}`;
}

// ─── Proper RFC-4180-compliant CSV parser ─────────────────────
// Handles: quoted fields, commas inside quotes, newlines inside quotes,
// escaped quotes (""), URLs, and all other edge cases.

function parseCSVToRows(text: string): string[][] {
  const rows: string[][] = [];
  let col = 0;
  let row: string[] = [""];
  let inQuotes = false;

  // Normalise line endings
  const input = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    const next = input[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        // Escaped quote inside a quoted field
        row[col] += '"';
        i++; // skip next quote
      } else if (ch === '"') {
        // End of quoted field
        inQuotes = false;
      } else {
        row[col] += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        col++;
        row.push("");
      } else if (ch === "\n") {
        // Skip completely blank lines
        const trimmed = row.map((c) => c.trim());
        if (trimmed.some((c) => c !== "")) {
          rows.push(trimmed);
        }
        row = [""];
        col = 0;
      } else {
        row[col] += ch;
      }
    }
  }

  // Push final row
  const trimmed = row.map((c) => c.trim());
  if (trimmed.some((c) => c !== "")) {
    rows.push(trimmed);
  }

  return rows;
}

// ─── File parsers ─────────────────────────────────────────────

async function parseXLSXFile(file: File): Promise<BulkLeadRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);

        const workbook = XLSX.read(data, {
          type: "array",
          cellFormula: true,
          raw: false,
          cellText: false,
        });

        const sheet = workbook.Sheets[workbook.SheetNames[0]];

        // Fix Excel phone-number formulas: =+919876543210 → +919876543210
        for (const addr of Object.keys(sheet)) {
          if (addr.startsWith("!")) continue;

          const cell: any = sheet[addr];

          if (cell?.f) {
            const formula = String(cell.f).trim();
            if (/^\+?\d[\d\s()-]+$/.test(formula)) {
              cell.t = "s";
              cell.v = formula.replace(/\s+/g, "");
              cell.w = cell.v;
            }
          }

          if (cell?.t === "e" && typeof cell?.w === "string") {
            const maybePhone = cell.w.replace(/^#ERROR!?$/, "").trim();
            if (/^\+?\d[\d\s()-]+$/.test(maybePhone)) {
              cell.t = "s";
              cell.v = maybePhone.replace(/\s+/g, "");
              cell.w = cell.v;
            }
          }
        }

        const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        resolve(mapRowsToLeads(rows));
      } catch (err: any) {
        reject(
          new Error(
            "Failed to parse Excel file: " + (err?.message || "Unknown error"),
          ),
        );
      }
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}

// ─── FIX: Uses proper RFC-4180 CSV parser instead of naive split(',') ────────
async function parseCSVText(text: string): Promise<BulkLeadRow[]> {
  const allRows = parseCSVToRows(text);

  if (allRows.length < 2) {
    throw new Error("CSV must have a header row and at least one data row");
  }

  const headers = allRows[0];
  const dataRows = allRows.slice(1);

  const objectRows = dataRows.map((cells) => {
    const obj: Record<string, string> = {};
    headers.forEach((header, i) => {
      if (header) {
        obj[header] = cells[i] ?? "";
      }
    });
    return obj;
  });

  return mapRowsToLeads(objectRows);
}

async function parsePDFFile(file: File): Promise<BulkLeadRow[]> {
  const pdfjsLib = await import("pdfjs-dist");

  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.mjs",
    import.meta.url,
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = "";

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => ("str" in item ? item.str : ""))
      .join(" ");
    fullText += "\n" + pageText;
  }

  if (!fullText.trim()) {
    throw new Error("No text found in PDF. PDF may be scanned/image-based.");
  }

  fullText = fullText
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
  const PHONE_REGEX = /(\+?\d[\d\s()-]{7,}\d)/g;
  // Detect URLs (website, LinkedIn, etc.) to capture as extra data
  const URL_REGEX = /https?:\/\/[^\s,;)>"']+/gi;

  const emails = [...fullText.matchAll(EMAIL_REGEX)];

  if (emails.length === 0) {
    throw new Error(
      "No email addresses found in PDF. Cannot detect lead rows.",
    );
  }

  const leads: any[] = [];

  for (let i = 0; i < emails.length; i++) {
    const currentEmail = emails[i];
    const start = Math.max(0, currentEmail.index! - 120);
    const end =
      i < emails.length - 1 ? emails[i + 1].index! : currentEmail.index! + 300;
    const chunk = fullText.slice(start, end);
    const email = currentEmail[0];

    const phoneMatch = chunk.match(PHONE_REGEX);
    let phone = "";
    if (phoneMatch?.length) {
      phone = phoneMatch[0].replace(/\s+/g, "").replace(/[^\d+]/g, "");
    }

    const beforeEmail = chunk.split(email)[0].trim();
    const possibleName = beforeEmail
      .split(" ")
      .slice(-4)
      .join(" ")
      .replace(/[^\w\s]/g, "")
      .trim();
    const name = possibleName.replace(/\d+/g, "").replace(/\s+/g, " ").trim();

    // Capture any URLs in the chunk as extra data
    const urls = [...chunk.matchAll(URL_REGEX)].map((m) => m[0]);
    const extraData: Record<string, any> = {};
    if (email) extraData["email"] = email;
    if (urls.length > 0) {
      urls.forEach((url, idx) => {
        const key = url.includes("linkedin")
          ? "linkedin"
          : url.includes("twitter") || url.includes("x.com")
            ? "twitter"
            : url.includes("instagram")
              ? "instagram"
              : url.includes("facebook")
                ? "facebook"
                : idx === 0
                  ? "website"
                  : `url_${idx + 1}`;
        extraData[key] = url;
      });
    }

    // Skip only if both name AND phone are missing — not just one
    if (!name && !phone) {
      continue;
    }

    leads.push({
      name: name || "Unknown",
      phone: phone || "",
      priority: "MEDIUM",
      ...extraData,
    });
  }

  const unique = Array.from(
    new Map(leads.map((l) => [`${l.email ?? l.name}-${l.phone}`, l])).values(),
  );

  if (unique.length === 0) {
    throw new Error("Could not parse any valid leads from PDF.");
  }

  return mapRowsToLeads(unique);
}

async function parseDOCXFile(file: File): Promise<BulkLeadRow[]> {
  const mammoth = await import("mammoth");
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  const html = result.value;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const table = doc.querySelector("table");

  if (!table) {
    const textResult = await mammoth.extractRawText({ arrayBuffer });
    const lines = textResult.value
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2)
      throw new Error(
        "No table or structured data found in the Word document.",
      );
    const sep = lines[0].includes("\t") ? "\t" : ",";
    const headers = lines[0].split(sep).map((h) => h.trim());
    const rows = lines.slice(1).map((line) => {
      const vals = line.split(sep).map((v) => v.trim());
      return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? ""]));
    });
    return mapRowsToLeads(rows);
  }

  const tableRows = Array.from(table.querySelectorAll("tr"));
  if (tableRows.length < 2)
    throw new Error("The Word document table has no data rows.");

  const headers = Array.from(tableRows[0].querySelectorAll("th,td")).map(
    (cell) => cell.textContent?.trim() ?? "",
  );

  const rows = tableRows.slice(1).map((tr) => {
    const cells = Array.from(tr.querySelectorAll("th,td")).map(
      (td) => td.textContent?.trim() ?? "",
    );
    return Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? ""]));
  });

  return mapRowsToLeads(rows);
}

// ─── Fuzzy key lookup ─────────────────────────────────────────

function fuzzyGet(row: Record<string, any>, ...aliases: string[]): string {
  // Pass 1: exact key match
  for (const alias of aliases) {
    if (row[alias] !== undefined && String(row[alias]).trim() !== "")
      return String(row[alias]).trim();
  }
  // Pass 2: normalise both row key and alias then compare exactly
  // Handles "Business Name"→"businessname", "Contact Number"→"contactnumber" etc.
  const normedAliases = new Set(
    aliases.map((a) => a.toLowerCase().replace(/[^a-z0-9]/g, "")),
  );
  for (const [k, v] of Object.entries(row)) {
    const nk = k.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (normedAliases.has(nk)) {
      const val = String(v ?? "").trim();
      if (val) return val;
    }
  }
  return "";
}

// ─── FIX: mapRowsToLeads ──────────────────────────────────────
// Key changes:
//   1. Only `name` and `phone` are mandatory — missing either sets a warning
//      but does NOT block the row from being submitted (error is advisory only).
//   2. Reserved-key matching is now EXACT only (no substring matching) so
//      columns like `website`, `platform`, `linkedin` are never dropped.
//   3. All non-reserved columns (including URLs, custom fields, etc.) are
//      always included in `data`.

function normaliseKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// ─── All known aliases for name / phone / priority ────────────
// Add new aliases here whenever you encounter a new column naming convention.
const NAME_ALIASES = [
  "name",
  "fullname",
  "full_name",
  "leadname",
  "lead_name",
  "businessname",
  "business_name",
  "companyname",
  "company_name",
  "organisation",
  "organization",
  "clientname",
  "client_name",
  "customername",
  "customer_name",
  "contactname",
  "contact_name",
  "firstname",
  "first_name",
  "lastname",
  "last_name",
  "personname",
  "person_name",
  "shopname",
  "shop_name",
  "storename",
  "store_name",
  "brandname",
  "brand_name",
  "accountname",
  "account_name",
];

const PHONE_ALIASES = [
  "phone",
  "mobile",
  "phonenumber",
  "phone_number",
  "mobilenumber",
  "mobile_number",
  "contactnumber",
  "contact_number",
  "contactno",
  "contact_no",
  "phoneno",
  "phone_no",
  "mobileno",
  "mobile_no",
  "tel",
  "telephone",
  "telephonenumber",
  "telephone_number",
  "whatsapp",
  "whatsappnumber",
  "whatsapp_number",
  "cell",
  "cellphone",
  "cell_phone",
  "number",
  "contact",
];

const PRIORITY_ALIASES = [
  "priority",
  "prioritylevel",
  "priority_level",
  "leadpriority",
  "lead_priority",
  "urgency",
  "importance",
];

// Strict set of reserved column names (normalised) — exact match only
// so columns like website, platform, linkedin are NEVER dropped
const RESERVED_KEYS = new Set([
  ...NAME_ALIASES.map(normaliseKey),
  ...PHONE_ALIASES.map(normaliseKey),
  ...PRIORITY_ALIASES.map(normaliseKey),
]);

function mapRowsToLeads(rows: any[]): BulkLeadRow[] {
  return rows.map((row, idx) => {
    const name = fuzzyGet(row, ...NAME_ALIASES);
    const rawPhone = fuzzyGet(row, ...PHONE_ALIASES);

    // Collapse "+91 98765 43210" → "+919876543210"
    const phone = rawPhone
      .replace(
        /^(\+\d{1,3})\s+([\d\s]+)$/,
        (_, code, rest) => code + rest.replace(/\s+/g, ""),
      )
      .trim();

    const rawPriority = fuzzyGet(row, ...PRIORITY_ALIASES) || "MEDIUM";
    const priority: Priority = ["HIGH", "MEDIUM", "LOW"].includes(
      rawPriority.toUpperCase(),
    )
      ? (rawPriority.toUpperCase() as Priority)
      : "MEDIUM";

    // ── Collect ALL non-reserved columns into data ────────────
    // Uses exact match against RESERVED_KEYS only — no substring fuzzing —
    // so columns like website, linkedin, platform, source, etc. are kept.
    const data: Record<string, any> = {};
    for (const [k, v] of Object.entries(row)) {
      const nk = normaliseKey(k);
      if (!RESERVED_KEYS.has(nk) && String(v ?? "").trim() !== "") {
        data[k] = v;
      }
    }

    // Advisory error — row is still submitted, API will handle missing fields
    const missingFields: string[] = [];
    if (!name) missingFields.push("name");
    if (!phone) missingFields.push("phone");

    return {
      rowIndex: idx + 2,
      name: name || "(unknown)",
      phone,
      priority,
      data,
      status: "pending" as const,
      // Only hard-block if BOTH are missing; single missing field is a warning
      error:
        missingFields.length === 2
          ? "Missing name and phone"
          : missingFields.length === 1
            ? `Missing ${missingFields[0]}`
            : undefined,
    };
  });
}

// ─── Component ───────────────────────────────────────────────

export default function CreateLeadPage() {
  const router = useRouter();
  const { showToast, ToastComponent } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Single lead
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [fields, setFields] = useState<DynamicField[]>([]);
  const [loading, setLoading] = useState(false);

  // Tab & bulk
  const [tab, setTab] = useState<TabMode>("single");
  const [bulkInputMode, setBulkInputMode] = useState<BulkInputMode>("file");
  const [googleSheetUrl, setGoogleSheetUrl] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [parsedLeads, setParsedLeads] = useState<BulkLeadRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);

  // ── Single lead handlers ──────────────────────────────────

  const addField = () => {
    setFields([
      ...fields,
      { id: crypto.randomUUID(), key: "", type: "TEXT", value: "" },
    ]);
  };

  const updateField = (id: string, updated: Partial<DynamicField>) => {
    setFields(fields.map((f) => (f.id === id ? { ...f, ...updated } : f)));
  };

  const removeField = (id: string) => {
    setFields(fields.filter((f) => f.id !== id));
  };

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim()) {
      showToast("Name and Phone are required", "destructive");
      return;
    }
    const dynamicData: Record<string, any> = {};
    for (const field of fields) {
      if (!field.key.trim()) continue;
      dynamicData[field.key] = field.value;
    }
    setLoading(true);
    try {
      await api.post("/leads", { name, phone, priority, data: dynamicData });
      showToast("Lead created successfully!", "success");
      setTimeout(() => router.push("/admin/leads"), 1200);
    } catch (err: any) {
      showToast(
        err?.response?.data?.message ?? "Failed to create lead",
        "destructive",
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Bulk file handling ────────────────────────────────────

  const processFile = useCallback(async (file: File) => {
    setParseError(null);
    setParsedLeads([]);
    setUploadedFileName(file.name);

    try {
      let leads: BulkLeadRow[] = [];
      const ext = file.name.split(".").pop()?.toLowerCase();

      if (ext === "xlsx" || ext === "xls") {
        leads = await parseXLSXFile(file);
      } else if (ext === "csv") {
        const text = await file.text();
        leads = await parseCSVText(text);
      } else if (ext === "pdf") {
        leads = await parsePDFFile(file);
      } else if (ext === "docx" || ext === "doc") {
        leads = await parseDOCXFile(file);
      } else {
        throw new Error(
          "Unsupported file type. Supported: .xlsx, .xls, .csv, .pdf, .docx",
        );
      }

      if (leads.length === 0) throw new Error("No data rows found in the file");
      setParsedLeads(leads);
    } catch (err: any) {
      setParseError(err.message ?? "Failed to parse file");
      setUploadedFileName(null);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleGoogleSheetImport = async () => {
    setParseError(null);
    setParsedLeads([]);
    const sheetId = extractSheetId(googleSheetUrl);
    if (!sheetId) {
      setParseError(
        "Invalid Google Sheets URL. Make sure the sheet is publicly accessible (Anyone with link → Viewer).",
      );
      return;
    }
    const csvUrl = buildSheetsExportUrl(sheetId);
    try {
      setBulkLoading(true);
      const res = await fetch(csvUrl);
      if (!res.ok)
        throw new Error(
          'Failed to fetch sheet. Make sure the sheet is set to "Anyone with link can view".',
        );
      const text = await res.text();
      const leads = await parseCSVText(text);
      if (leads.length === 0)
        throw new Error("No data rows found in the sheet");
      setParsedLeads(leads);
      setUploadedFileName("Google Sheet");
    } catch (err: any) {
      setParseError(err.message ?? "Failed to import Google Sheet");
    } finally {
      setBulkLoading(false);
    }
  };

  // ── FIX: validCount now includes rows with only a warning (missing one field)
  // Hard-blocked rows are those missing BOTH name and phone.
  const hardErrorCount = parsedLeads.filter((l) =>
    !l.name || l.name === "(unknown)" ? !l.phone : false,
  ).length;

  // Submittable = has at least a phone (name falls back to "(unknown)")
  const validLeads = parsedLeads.filter((l) => !!l.phone);
  const validCount = validLeads.length;
  const warningCount = parsedLeads.filter((l) => !!l.error && !!l.phone).length;
  const errorCount = parsedLeads.filter((l) => !l.phone).length;

  const handleBulkSubmit = async () => {
    if (validCount === 0) {
      showToast("No valid leads to submit", "destructive");
      return;
    }

    setBulkLoading(true);
    setBulkProgress(0);

    setParsedLeads((prev) =>
      prev.map((l) => (!l.phone ? l : { ...l, status: "pending" as const })),
    );

    const results = [...parsedLeads];
    let done = 0;

    const BATCH = 50;
    const batches: BulkLeadRow[][] = [];
    for (let i = 0; i < validLeads.length; i += BATCH) {
      batches.push(validLeads.slice(i, i + BATCH));
    }

    for (const batch of batches) {
      try {
        await api.post("/leads/bulk", {
          leads: batch.map((l) => ({
            name: l.name,
            phone: l.phone,
            priority: l.priority,
            data: l.data,
          })),
        });
        for (const lead of batch) {
          const idx = results.findIndex((r) => r.rowIndex === lead.rowIndex);
          if (idx !== -1) results[idx] = { ...results[idx], status: "success" };
        }
      } catch (err: any) {
        for (const lead of batch) {
          const idx = results.findIndex((r) => r.rowIndex === lead.rowIndex);
          if (idx !== -1)
            results[idx] = {
              ...results[idx],
              status: "error",
              error: err?.response?.data?.message ?? "Batch failed",
            };
        }
      }
      done += batch.length;
      setBulkProgress(Math.round((done / validLeads.length) * 100));
      setParsedLeads([...results]);
    }

    const successCount = results.filter((r) => r.status === "success").length;
    const failCount = results.filter((r) => r.status === "error").length;

    showToast(
      `Done! ${successCount} leads created${failCount > 0 ? `, ${failCount} failed` : ""}.`,
      successCount > 0 ? "success" : "destructive",
    );
    setBulkLoading(false);
  };

  const clearBulk = () => {
    setParsedLeads([]);
    setParseError(null);
    setUploadedFileName(null);
    setGoogleSheetUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {ToastComponent}

      <div>
        <h1 className="text-2xl font-bold">Create Lead</h1>
        <p className="text-muted-foreground text-sm mt-1">
          L1 and L2 leads are auto-approved. L3 leads require approval.
        </p>
      </div>

      {/* Tab Toggle */}
      <div className="flex rounded-lg border p-1 gap-1 bg-muted w-fit">
        <button
          onClick={() => setTab("single")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === "single"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Single Lead
        </button>
        <button
          onClick={() => setTab("bulk")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === "bulk"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Bulk Import
        </button>
      </div>

      {/* ── SINGLE LEAD ── */}
      {tab === "single" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  placeholder="Lead name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  placeholder="+91 9999999999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Priority</Label>
                <Select
                  value={priority}
                  onValueChange={(v) => setPriority(v as Priority)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HIGH">🔴 High</SelectItem>
                    <SelectItem value="MEDIUM">🟠 Medium</SelectItem>
                    <SelectItem value="LOW">⚪ Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Additional Data</CardTitle>
                <Button variant="outline" size="sm" onClick={addField}>
                  <Plus size={14} className="mr-1" /> Add Field
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No additional fields. Click "Add Field" to add custom data.
                </p>
              )}
              {fields.map((field) => (
                <div key={field.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex gap-2 items-end">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Field Key</Label>
                      <Input
                        placeholder="e.g. business_name"
                        value={field.key}
                        onChange={(e) =>
                          updateField(field.id, { key: e.target.value })
                        }
                      />
                    </div>
                    <div className="w-40 space-y-1">
                      <Label className="text-xs">Type</Label>
                      <Select
                        value={field.type}
                        onValueChange={(v) =>
                          updateField(field.id, {
                            type: v as FieldType,
                            value: "",
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TEXT">Text</SelectItem>
                          <SelectItem value="NUMBER">Number</SelectItem>
                          <SelectItem value="BOOLEAN">Boolean</SelectItem>
                          <SelectItem value="DATE">Date</SelectItem>
                          <SelectItem value="DROPDOWN">Dropdown</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeField(field.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Value</Label>
                    {field.type === "TEXT" && (
                      <Input
                        placeholder="Value"
                        value={field.value}
                        onChange={(e) =>
                          updateField(field.id, { value: e.target.value })
                        }
                      />
                    )}
                    {field.type === "NUMBER" && (
                      <Input
                        type="number"
                        placeholder="0"
                        value={field.value}
                        onChange={(e) =>
                          updateField(field.id, {
                            value: Number(e.target.value),
                          })
                        }
                      />
                    )}
                    {field.type === "BOOLEAN" && (
                      <Select
                        value={String(field.value)}
                        onValueChange={(v) =>
                          updateField(field.id, { value: v === "true" })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">True</SelectItem>
                          <SelectItem value="false">False</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    {field.type === "DATE" && (
                      <Input
                        type="date"
                        value={field.value}
                        onChange={(e) =>
                          updateField(field.id, { value: e.target.value })
                        }
                      />
                    )}
                    {field.type === "DROPDOWN" && (
                      <div className="space-y-2">
                        <Input
                          placeholder="Options: a, b, c (comma separated)"
                          value={field.dropdownOptions ?? ""}
                          onChange={(e) =>
                            updateField(field.id, {
                              dropdownOptions: e.target.value,
                            })
                          }
                        />
                        {field.dropdownOptions && (
                          <Select
                            value={field.value}
                            onValueChange={(v) =>
                              updateField(field.id, { value: v })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select option" />
                            </SelectTrigger>
                            <SelectContent>
                              {field.dropdownOptions
                                .split(",")
                                .map((o) => o.trim())
                                .filter(Boolean)
                                .map((opt) => (
                                  <SelectItem key={opt} value={opt}>
                                    {opt}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => router.push("/admin/leads")}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1"
            >
              {loading ? "Creating…" : "Create Lead"}
            </Button>
          </div>
        </>
      )}

      {/* ── BULK IMPORT ── */}
      {tab === "bulk" && (
        <div className="space-y-5">
          {/* Source toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                setBulkInputMode("file");
                clearBulk();
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                bulkInputMode === "file"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-muted-foreground hover:border-foreground/30"
              }`}
            >
              <Upload size={15} /> Upload File
            </button>
            <button
              onClick={() => {
                setBulkInputMode("google");
                clearBulk();
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                bulkInputMode === "google"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-muted-foreground hover:border-foreground/30"
              }`}
            >
              <Link size={15} /> Google Sheets
            </button>
          </div>

          {/* ── File upload mode ── */}
          {bulkInputMode === "file" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Upload File</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {[
                    {
                      icon: <FileSpreadsheet size={13} />,
                      label: ".xlsx / .xls",
                      note: "Recommended",
                    },
                    { icon: <FileText size={13} />, label: ".csv", note: "" },
                    { icon: <File size={13} />, label: ".pdf", note: "" },
                    { icon: <FileText size={13} />, label: ".docx", note: "" },
                  ].map(({ icon, label, note }) => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs text-muted-foreground"
                    >
                      {icon} {label}
                      {note && (
                        <span className="text-[10px] bg-muted px-1 rounded">
                          {note}
                        </span>
                      )}
                    </span>
                  ))}
                </div>

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                    dragOver
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-foreground/30 hover:bg-muted/30"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".xlsx,.xls,.csv,.pdf,.docx,.doc"
                    onChange={handleFileChange}
                  />
                  <Upload
                    className="mx-auto mb-3 text-muted-foreground"
                    size={32}
                  />
                  <p className="font-medium text-sm">
                    {dragOver
                      ? "Drop file here"
                      : "Drag & drop or click to browse"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports .xlsx, .xls, .csv, .pdf, .docx
                  </p>
                </div>

                <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">
                    Required columns in your file:
                  </p>
                  <p>
                    <code className="bg-background border rounded px-1">
                      name
                    </code>{" "}
                    <code className="bg-background border rounded px-1">
                      phone
                    </code>{" "}
                    <code className="bg-background border rounded px-1">
                      priority
                    </code>{" "}
                    (optional, defaults to MEDIUM)
                  </p>
                  <p>
                    Any extra columns (website, linkedin, platform, source,
                    etc.) are automatically saved as lead data fields.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Google Sheets mode ── */}
          {bulkInputMode === "google" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Import from Google Sheets
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 space-y-1">
                  <p className="font-medium">Before importing:</p>
                  <p>
                    Open your Google Sheet → Share → Change to{" "}
                    <strong>"Anyone with the link"</strong> → Viewer. Then paste
                    the URL below.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Google Sheets URL</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                      value={googleSheetUrl}
                      onChange={(e) => setGoogleSheetUrl(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleGoogleSheetImport}
                      disabled={bulkLoading || !googleSheetUrl.trim()}
                      variant="outline"
                    >
                      {bulkLoading ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        "Import"
                      )}
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">
                    Required sheet columns:
                  </p>
                  <p>
                    <code className="bg-background border rounded px-1">
                      name
                    </code>{" "}
                    <code className="bg-background border rounded px-1">
                      phone
                    </code>{" "}
                    <code className="bg-background border rounded px-1">
                      priority
                    </code>{" "}
                    (optional)
                  </p>
                  <p>Extra columns become dynamic lead data fields.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Parse error ── */}
          {parseError && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <p>{parseError}</p>
            </div>
          )}

          {/* ── Preview table ── */}
          {parsedLeads.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-base">
                      Preview{" "}
                      <span className="text-muted-foreground font-normal text-sm">
                        ({parsedLeads.length} rows)
                      </span>
                    </CardTitle>
                    <div className="flex gap-2 text-xs">
                      {validCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                          <CheckCircle2 size={11} /> {validCount} ready
                        </span>
                      )}
                      {warningCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                          <AlertCircle size={11} /> {warningCount} warnings
                        </span>
                      )}
                      {errorCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                          <AlertCircle size={11} /> {errorCount} skipped
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowPreview((v) => !v)}
                      className="text-muted-foreground hover:text-foreground text-xs flex items-center gap-1"
                    >
                      {showPreview ? (
                        <ChevronUp size={14} />
                      ) : (
                        <ChevronDown size={14} />
                      )}
                      {showPreview ? "Collapse" : "Expand"}
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={clearBulk}
                      className="h-7 w-7"
                    >
                      <X size={14} />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {showPreview && (
                <CardContent className="p-0">
                  <div className="overflow-auto max-h-80 rounded-b-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground w-12">
                            Row
                          </th>
                          <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">
                            Name
                          </th>
                          <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">
                            Phone
                          </th>
                          <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">
                            Priority
                          </th>
                          <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">
                            Extra Fields
                          </th>
                          <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedLeads.map((lead) => {
                          const isHardError = !lead.phone;
                          const isWarning = !!lead.error && !!lead.phone;
                          const extraFieldCount = Object.keys(lead.data).length;

                          return (
                            <tr
                              key={lead.rowIndex}
                              className={`border-t ${
                                isHardError
                                  ? "bg-red-50/50"
                                  : isWarning
                                    ? "bg-amber-50/30"
                                    : ""
                              }`}
                            >
                              <td className="px-4 py-2 text-muted-foreground text-xs">
                                {lead.rowIndex}
                              </td>
                              <td className="px-4 py-2">
                                {lead.name === "(unknown)" ? (
                                  <span className="text-amber-600 text-xs italic">
                                    unknown
                                  </span>
                                ) : (
                                  lead.name
                                )}
                              </td>
                              <td className="px-4 py-2 font-mono text-xs">
                                {lead.phone || (
                                  <span className="text-destructive text-xs italic">
                                    missing
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2">
                                <span
                                  className={`text-xs font-medium ${
                                    lead.priority === "HIGH"
                                      ? "text-red-600"
                                      : lead.priority === "MEDIUM"
                                        ? "text-orange-500"
                                        : "text-muted-foreground"
                                  }`}
                                >
                                  {lead.priority}
                                </span>
                              </td>
                              <td className="px-4 py-2">
                                {extraFieldCount > 0 ? (
                                  <span className="text-xs text-muted-foreground">
                                    {extraFieldCount} field
                                    {extraFieldCount !== 1 ? "s" : ""}{" "}
                                    <span
                                      className="text-foreground/50"
                                      title={Object.keys(lead.data).join(", ")}
                                    >
                                      (
                                      {Object.keys(lead.data)
                                        .slice(0, 2)
                                        .join(", ")}
                                      {extraFieldCount > 2 ? "…" : ""})
                                    </span>
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground/40">
                                    —
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2">
                                {lead.status === "success" ? (
                                  <span className="inline-flex items-center gap-1 text-xs text-green-700">
                                    <CheckCircle2 size={12} /> Created
                                  </span>
                                ) : lead.status === "error" ? (
                                  <span
                                    className="inline-flex items-center gap-1 text-xs text-red-600"
                                    title={lead.error}
                                  >
                                    <AlertCircle size={12} /> Failed
                                  </span>
                                ) : isHardError ? (
                                  <span className="inline-flex items-center gap-1 text-xs text-red-600">
                                    <AlertCircle size={12} /> Skipped (no phone)
                                  </span>
                                ) : isWarning ? (
                                  <span
                                    className="inline-flex items-center gap-1 text-xs text-amber-600"
                                    title={lead.error}
                                  >
                                    <AlertCircle size={12} /> {lead.error}
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    Ready
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {/* ── Progress bar ── */}
          {bulkLoading && bulkProgress > 0 && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Uploading leads…</span>
                <span>{bulkProgress}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${bulkProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* ── Action buttons ── */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => router.push("/admin/leads")}
              className="flex-1"
              disabled={bulkLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkSubmit}
              disabled={bulkLoading || validCount === 0}
              className="flex-1"
            >
              {bulkLoading ? (
                <>
                  <Loader2 size={14} className="mr-2 animate-spin" /> Importing…
                </>
              ) : (
                `Import ${validCount > 0 ? `${validCount} ` : ""}Lead${validCount !== 1 ? "s" : ""}`
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
