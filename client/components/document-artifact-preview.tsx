"use client";

import { useEffect, useRef, useState } from "react";

type DocumentArtifactPreviewProps = {
  mimeType: string | null;
  documentName: string;
  rawDocumentHref: string | null;
  sectionClassName?: string;
};

const TEXT_PREVIEW_MAX_CHARS = 20000;
const DOCX_PREVIEW_TIMEOUT_MS = 10000;
const DOCX_FETCH_TIMEOUT_MS = 10000;
const SPREADSHEET_FETCH_TIMEOUT_MS = 10000;
const SPREADSHEET_PREVIEW_MAX_ROWS = 200;
const SPREADSHEET_PREVIEW_MAX_COLS = 50;
const XLSX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const XLSM_MIME_TYPE = "application/vnd.ms-excel.sheet.macroEnabled.12";

type DocxPreviewStatus =
  | "idle"
  | "fetching"
  | "loading-library"
  | "rendering"
  | "rendered"
  | "failed";

type SpreadsheetSheetPreview = {
  name: string;
  rows: string[][];
  startColumn: number;
  startRow: number;
  totalColumns: number;
  totalRows: number;
  truncated: boolean;
};

function logDocxPreviewStatus(documentName: string, status: DocxPreviewStatus, detail?: string) {
  const suffix = detail ? ` ${detail}` : "";
  console.info(`[docx-preview] ${documentName}: ${status}${suffix}`);
}

function docxPreviewStatusMessage(status: DocxPreviewStatus, detail: string | null) {
  switch (status) {
    case "fetching":
      return "Loading preview… Fetching the Word document from the server.";
    case "loading-library":
      return "Loading preview… Starting the in-browser Word viewer.";
    case "rendering":
      return detail
        ? `Loading preview… Rendering the Word document in the browser. ${detail}`
        : "Loading preview… Rendering the Word document in the browser.";
    case "failed":
      return detail
        ? `This Word document could not be rendered inline. ${detail} You can still open the raw document separately.`
        : "This Word document could not be rendered inline. The browser preview failed, but you can still open the raw document separately.";
    default:
      return null;
  }
}

function supportsTextPreview(mimeType: string | null) {
  return Boolean(
    mimeType &&
      (mimeType.startsWith("text/") ||
        mimeType === "application/json" ||
        mimeType === "application/xml")
  );
}

function supportsPdfPreview(mimeType: string | null) {
  return mimeType === "application/pdf";
}

function supportsDocxPreview(mimeType: string | null, documentName: string) {
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return true;
  }
  return documentName.toLowerCase().endsWith(".docx");
}

function supportsSpreadsheetPreview(mimeType: string | null, documentName: string) {
  if (mimeType === XLSX_MIME_TYPE || mimeType === XLSM_MIME_TYPE) {
    return true;
  }
  const lowerDocumentName = documentName.toLowerCase();
  return lowerDocumentName.endsWith(".xlsx") || lowerDocumentName.endsWith(".xlsm");
}

function isMacroEnabledSpreadsheet(mimeType: string | null, documentName: string) {
  return mimeType === XLSM_MIME_TYPE || documentName.toLowerCase().endsWith(".xlsm");
}

function spreadsheetColumnLabel(index: number) {
  let value = index;
  let label = "";

  do {
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26) - 1;
  } while (value >= 0);

  return label;
}

function previewExplanationForUnsupportedType(mimeType: string | null, documentName: string) {
  const extension = documentName.includes(".") ? documentName.split(".").pop()?.toLowerCase() : null;
  if (mimeType) {
    return `This file type is not yet supported for inline preview in the app (${mimeType}). You can still open the raw document separately.`;
  }
  if (extension) {
    return `This .${extension} file is not yet supported for inline preview in the app. You can still open the raw document separately.`;
  }
  return "This file type is not yet supported for inline preview in the app. You can still open the raw document separately.";
}

export function DocumentArtifactPreview({
  mimeType,
  documentName,
  rawDocumentHref,
  sectionClassName = "review-evidence-block"
}: DocumentArtifactPreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const docxPreviewRef = useRef<HTMLDivElement | null>(null);
  const [activated, setActivated] = useState(false);
  const [textPreview, setTextPreview] = useState<string | null>(null);
  const [loadingTextPreview, setLoadingTextPreview] = useState(false);
  const [textPreviewError, setTextPreviewError] = useState<string | null>(null);
  const [loadingDocxPreview, setLoadingDocxPreview] = useState(false);
  const [docxPreviewError, setDocxPreviewError] = useState<string | null>(null);
  const [docxPreviewRendered, setDocxPreviewRendered] = useState(false);
  const [docxPreviewStatus, setDocxPreviewStatus] = useState<DocxPreviewStatus>("idle");
  const [docxPreviewDetail, setDocxPreviewDetail] = useState<string | null>(null);
  const [loadingSpreadsheetPreview, setLoadingSpreadsheetPreview] = useState(false);
  const [spreadsheetPreviewError, setSpreadsheetPreviewError] = useState<string | null>(null);
  const [spreadsheetSheets, setSpreadsheetSheets] = useState<SpreadsheetSheetPreview[] | null>(null);
  const [selectedSpreadsheetSheet, setSelectedSpreadsheetSheet] = useState<string | null>(null);

  useEffect(() => {
    setTextPreview(null);
    setLoadingTextPreview(false);
    setTextPreviewError(null);
    setLoadingDocxPreview(false);
    setDocxPreviewError(null);
    setDocxPreviewRendered(false);
    setDocxPreviewStatus("idle");
    setDocxPreviewDetail(null);
    setLoadingSpreadsheetPreview(false);
    setSpreadsheetPreviewError(null);
    setSpreadsheetSheets(null);
    setSelectedSpreadsheetSheet(null);

    if (docxPreviewRef.current) {
      docxPreviewRef.current.innerHTML = "";
    }
  }, [documentName, mimeType, rawDocumentHref]);

  useEffect(() => {
    const host = containerRef.current;
    if (!host) {
      return;
    }

    const details = host.closest("details");
    if (!details) {
      setActivated(true);
      return;
    }

    const handleToggle = () => {
      if (details.open) {
        setActivated(true);
      }
    };

    handleToggle();
    details.addEventListener("toggle", handleToggle);
    return () => {
      details.removeEventListener("toggle", handleToggle);
    };
  }, []);

  useEffect(() => {
    if (!activated || !supportsTextPreview(mimeType) || !rawDocumentHref || textPreview || textPreviewError) {
      return;
    }

    const controller = new AbortController();
    setLoadingTextPreview(true);
    setTextPreviewError(null);

    fetch(rawDocumentHref, {
      cache: "no-store",
      signal: controller.signal
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Preview request failed: ${response.status}`);
        }
        const fileBuffer = await response.arrayBuffer();
        const decodedText = new TextDecoder("utf-8", { fatal: false }).decode(fileBuffer);
        const normalizedText = decodedText.trim();
        setTextPreview(normalizedText ? normalizedText.slice(0, TEXT_PREVIEW_MAX_CHARS) : "");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setTextPreviewError(error instanceof Error ? error.message : "Preview request failed");
      })
      .finally(() => {
        setLoadingTextPreview(false);
      });

    return () => {
      controller.abort();
    };
  }, [activated, mimeType, rawDocumentHref, textPreview, textPreviewError]);

  useEffect(() => {
    if (
      !activated ||
      !supportsDocxPreview(mimeType, documentName) ||
      !rawDocumentHref ||
      !docxPreviewRef.current ||
      docxPreviewRendered ||
      docxPreviewError
    ) {
      return;
    }

    const controller = new AbortController();
    const host = docxPreviewRef.current;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let fetchTimeoutId: ReturnType<typeof setTimeout> | null = null;
    setLoadingDocxPreview(true);
    setDocxPreviewError(null);
    setDocxPreviewStatus("fetching");
    setDocxPreviewDetail(null);
    logDocxPreviewStatus(documentName, "fetching");

    const fetchWithTimeout = Promise.race([
      fetch(rawDocumentHref, {
        cache: "no-store",
        signal: controller.signal
      }),
      new Promise<Response>((_, reject) => {
        fetchTimeoutId = setTimeout(() => {
          controller.abort();
          reject(
            new Error(
              `The document could not be fetched within ${Math.round(
                DOCX_FETCH_TIMEOUT_MS / 1000
              )} seconds.`
            )
          );
        }, DOCX_FETCH_TIMEOUT_MS);
      })
    ]);

    fetchWithTimeout
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Preview request failed: ${response.status}`);
        }
        const responseMimeType = response.headers.get("content-type");
        setDocxPreviewStatus("loading-library");
        setDocxPreviewDetail(
          responseMimeType ? `Server content type: ${responseMimeType}.` : "The server did not provide a content type."
        );
        logDocxPreviewStatus(
          documentName,
          "loading-library",
          responseMimeType ? `(content-type: ${responseMimeType})` : "(no content-type header)"
        );
        const fileBuffer = await response.arrayBuffer();
        setDocxPreviewStatus("rendering");
        setDocxPreviewDetail(`Downloaded ${fileBuffer.byteLength.toLocaleString()} bytes.`);
        logDocxPreviewStatus(
          documentName,
          "rendering",
          `(${fileBuffer.byteLength.toLocaleString()} bytes)`
        );
        const { renderAsync } = await import("docx-preview");
        host.innerHTML = "";
        await Promise.race([
          renderAsync(fileBuffer, host, undefined, {
            className: "docx-preview-render",
            inWrapper: false,
            ignoreWidth: false,
            ignoreHeight: true,
            breakPages: false
          }),
          new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => {
              reject(
                new Error(
                  `The browser preview timed out after ${Math.round(
                    DOCX_PREVIEW_TIMEOUT_MS / 1000
                  )} seconds.`
                )
              );
            }, DOCX_PREVIEW_TIMEOUT_MS);
          })
        ]);
        if (!host.childNodes.length && !host.textContent?.trim()) {
          throw new Error("The browser preview engine returned without producing any visible output.");
        }
        setDocxPreviewRendered(true);
        setDocxPreviewStatus("rendered");
        setDocxPreviewDetail(null);
        logDocxPreviewStatus(documentName, "rendered");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        const detail = error instanceof Error ? error.message : "Preview request failed";
        host.innerHTML = "";
        setDocxPreviewError(detail);
        setDocxPreviewStatus("failed");
        setDocxPreviewDetail(detail);
        console.error(`[docx-preview] ${documentName}: failed`, error);
      })
      .finally(() => {
        if (fetchTimeoutId) {
          clearTimeout(fetchTimeoutId);
        }
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        setLoadingDocxPreview(false);
      });

    return () => {
      if (fetchTimeoutId) {
        clearTimeout(fetchTimeoutId);
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      controller.abort();
    };
  }, [
    activated,
    docxPreviewError,
    docxPreviewRendered,
    documentName,
    mimeType,
    rawDocumentHref
  ]);

  useEffect(() => {
    if (
      !activated ||
      !supportsSpreadsheetPreview(mimeType, documentName) ||
      !rawDocumentHref ||
      spreadsheetSheets ||
      spreadsheetPreviewError
    ) {
      return;
    }

    const controller = new AbortController();
    let fetchTimeoutId: ReturnType<typeof setTimeout> | null = null;
    setLoadingSpreadsheetPreview(true);
    setSpreadsheetPreviewError(null);

    const fetchWithTimeout = Promise.race([
      fetch(rawDocumentHref, {
        cache: "no-store",
        signal: controller.signal
      }),
      new Promise<Response>((_, reject) => {
        fetchTimeoutId = setTimeout(() => {
          controller.abort();
          reject(
            new Error(
              `The workbook could not be fetched within ${Math.round(
                SPREADSHEET_FETCH_TIMEOUT_MS / 1000
              )} seconds.`
            )
          );
        }, SPREADSHEET_FETCH_TIMEOUT_MS);
      })
    ]);

    fetchWithTimeout
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Preview request failed: ${response.status}`);
        }

        const fileBuffer = await response.arrayBuffer();
        const XLSX = await import("xlsx");
        const workbook = XLSX.read(fileBuffer, {
          type: "array",
          cellDates: true,
          cellText: true
        });

        const sheets = workbook.SheetNames.map((sheetName) => {
          const sheet = workbook.Sheets[sheetName];
          const reference = sheet?.["!ref"];

          if (!sheet || !reference) {
            return {
              name: sheetName,
              rows: [],
              startColumn: 0,
              startRow: 1,
              totalColumns: 0,
              totalRows: 0,
              truncated: false
            } satisfies SpreadsheetSheetPreview;
          }

          const range = XLSX.utils.decode_range(reference);
          const totalRows = range.e.r - range.s.r + 1;
          const totalColumns = range.e.c - range.s.c + 1;
          const endRow = Math.min(range.e.r, range.s.r + SPREADSHEET_PREVIEW_MAX_ROWS - 1);
          const endColumn = Math.min(range.e.c, range.s.c + SPREADSHEET_PREVIEW_MAX_COLS - 1);
          const rows: string[][] = [];

          for (let rowIndex = range.s.r; rowIndex <= endRow; rowIndex += 1) {
            const row: string[] = [];

            for (let columnIndex = range.s.c; columnIndex <= endColumn; columnIndex += 1) {
              const cell = sheet[XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex })] as
                | { w?: string; v?: unknown }
                | undefined;

              if (cell?.w) {
                row.push(cell.w);
              } else if (cell?.v instanceof Date) {
                row.push(cell.v.toLocaleString());
              } else if (cell?.v !== undefined && cell.v !== null) {
                row.push(String(cell.v));
              } else {
                row.push("");
              }
            }

            rows.push(row);
          }

          return {
            name: sheetName,
            rows,
            startColumn: range.s.c,
            startRow: range.s.r + 1,
            totalColumns,
            totalRows,
            truncated:
              totalRows > SPREADSHEET_PREVIEW_MAX_ROWS ||
              totalColumns > SPREADSHEET_PREVIEW_MAX_COLS
          } satisfies SpreadsheetSheetPreview;
        });

        setSpreadsheetSheets(sheets);
        setSelectedSpreadsheetSheet(sheets[0]?.name ?? null);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setSpreadsheetPreviewError(
          error instanceof Error ? error.message : "Spreadsheet preview request failed"
        );
      })
      .finally(() => {
        if (fetchTimeoutId) {
          clearTimeout(fetchTimeoutId);
        }
        setLoadingSpreadsheetPreview(false);
      });

    return () => {
      if (fetchTimeoutId) {
        clearTimeout(fetchTimeoutId);
      }
      controller.abort();
    };
  }, [activated, documentName, mimeType, rawDocumentHref, spreadsheetPreviewError, spreadsheetSheets]);

  const showTextPreview = activated && supportsTextPreview(mimeType);
  const showPdfPreview = activated && supportsPdfPreview(mimeType) && rawDocumentHref;
  const showSpreadsheetPreview =
    activated && supportsSpreadsheetPreview(mimeType, documentName) && rawDocumentHref;
  const showDocxPreview =
    activated && supportsDocxPreview(mimeType, documentName) && rawDocumentHref;
  const showMacroEnabledSpreadsheetNotice =
    showSpreadsheetPreview && isMacroEnabledSpreadsheet(mimeType, documentName);
  const activeSpreadsheetSheet =
    spreadsheetSheets?.find((sheet) => sheet.name === selectedSpreadsheetSheet) ??
    spreadsheetSheets?.[0] ??
    null;

  return (
    <div ref={containerRef}>
      <div className={sectionClassName}>
        <p className="eyebrow">Document preview</p>
        {!activated ? (
          <p className="meta-note">Preparing preview…</p>
        ) : showTextPreview ? (
          <>
            {loadingTextPreview ? (
              <p className="meta-note">Loading preview…</p>
            ) : textPreviewError ? (
              <p className="meta-note">
                This document could not be rendered inline as text. The raw artifact bytes could
                not be decoded into an in-app text preview. You can still open the raw document
                separately. {textPreviewError}
              </p>
            ) : textPreview ? (
              <pre className="document-text-preview">{textPreview}</pre>
            ) : (
              <p className="meta-note">
                This document could not be rendered inline as text. The file was identified as
                text-like, but the raw artifact did not contain any visible text to show. You can
                still open the raw document separately.
              </p>
            )}
          </>
        ) : showPdfPreview ? (
          <object
            className="document-pdf-preview"
            data={rawDocumentHref ?? undefined}
            type="application/pdf"
          >
            <p className="meta-note">
              This PDF could not be rendered inline. Your browser could not display the embedded PDF
              in this panel, but you can still open the raw document separately.
            </p>
          </object>
        ) : showSpreadsheetPreview ? (
          <>
            {loadingSpreadsheetPreview ? (
              <p className="meta-note">
                Loading preview… Fetching and parsing the workbook in the browser.
              </p>
            ) : null}
            {spreadsheetPreviewError ? (
              <p className="meta-note">
                This spreadsheet could not be rendered inline. The workbook preview failed, but
                you can still open the raw document separately. {spreadsheetPreviewError}
              </p>
            ) : null}
            {activeSpreadsheetSheet ? (
              <div className="document-spreadsheet-preview">
                {spreadsheetSheets && spreadsheetSheets.length > 1 ? (
                  <div className="document-spreadsheet-tabs" role="tablist" aria-label="Workbook sheets">
                    {spreadsheetSheets.map((sheet) => (
                      <button
                        key={sheet.name}
                        type="button"
                        className={`document-spreadsheet-tab${
                          sheet.name === activeSpreadsheetSheet.name ? " active" : ""
                        }`}
                        onClick={() => {
                          setSelectedSpreadsheetSheet(sheet.name);
                        }}
                      >
                        {sheet.name}
                      </button>
                    ))}
                  </div>
                ) : null}
                <p className="document-spreadsheet-meta">
                  Sheet {activeSpreadsheetSheet.name} · showing{" "}
                  {Math.min(activeSpreadsheetSheet.totalRows, SPREADSHEET_PREVIEW_MAX_ROWS)} of{" "}
                  {activeSpreadsheetSheet.totalRows} rows and{" "}
                  {Math.min(activeSpreadsheetSheet.totalColumns, SPREADSHEET_PREVIEW_MAX_COLS)} of{" "}
                  {activeSpreadsheetSheet.totalColumns} columns
                </p>
                {showMacroEnabledSpreadsheetNotice ? (
                  <p className="meta-note">
                    This is a macro-enabled Excel workbook. Macros are not executed in the browser
                    preview.
                  </p>
                ) : null}
                {activeSpreadsheetSheet.rows.length ? (
                  <div className="document-spreadsheet-grid-wrap">
                    <table className="document-spreadsheet-grid">
                      <thead>
                        <tr>
                          <th scope="col" className="document-spreadsheet-corner">
                            #
                          </th>
                          {activeSpreadsheetSheet.rows[0].map((_, columnIndex) => (
                            <th key={`${activeSpreadsheetSheet.name}-column-${columnIndex}`} scope="col">
                              {spreadsheetColumnLabel(activeSpreadsheetSheet.startColumn + columnIndex)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {activeSpreadsheetSheet.rows.map((row, rowIndex) => (
                          <tr key={`${activeSpreadsheetSheet.name}-row-${rowIndex}`}>
                            <th scope="row">
                              {activeSpreadsheetSheet.startRow + rowIndex}
                            </th>
                            {row.map((cell, columnIndex) => (
                              <td
                                key={`${activeSpreadsheetSheet.name}-${rowIndex}-${columnIndex}`}
                                title={cell}
                              >
                                {cell || " "}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="meta-note">
                    This sheet does not contain any visible cells in its used range.
                  </p>
                )}
                {activeSpreadsheetSheet.truncated ? (
                  <p className="meta-note">
                    This preview is capped to the first {SPREADSHEET_PREVIEW_MAX_ROWS} rows and{" "}
                    {SPREADSHEET_PREVIEW_MAX_COLS} columns for browser performance. Use the raw
                    document link to inspect the full workbook.
                  </p>
                ) : null}
              </div>
            ) : !loadingSpreadsheetPreview && !spreadsheetPreviewError ? (
              <p className="meta-note">
                This spreadsheet could not be rendered inline. The workbook did not contain any
                previewable sheets, but you can still open the raw document separately.
              </p>
            ) : null}
          </>
        ) : showDocxPreview ? (
          <>
            {loadingDocxPreview && docxPreviewStatusMessage(docxPreviewStatus, docxPreviewDetail) ? (
              <p className="meta-note">
                {docxPreviewStatusMessage(docxPreviewStatus, docxPreviewDetail)}
              </p>
            ) : null}
            {docxPreviewError ? (
              <p className="meta-note">
                {docxPreviewStatusMessage("failed", docxPreviewDetail ?? docxPreviewError)}
              </p>
            ) : !loadingDocxPreview && !docxPreviewRendered ? (
              <p className="meta-note">
                This Word document could not be rendered inline. The file appears to be a DOCX, but
                no browser preview was produced. You can still open the raw document separately.
              </p>
            ) : null}
            <div className="document-docx-preview" ref={docxPreviewRef} />
          </>
        ) : (
          <p className="meta-note">
            {previewExplanationForUnsupportedType(mimeType, documentName)}
          </p>
        )}
      </div>
    </div>
  );
}
