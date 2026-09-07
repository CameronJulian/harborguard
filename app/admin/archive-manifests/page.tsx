"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import AppShell from "@/components/AppShell";

import {
  fetchWithAuth,
} from "@/lib/auth-fetch";


const CONFIRMATION =
  "PRUNE_VERIFIED_ARCHIVE";


type ManifestListItem = {
  manifestId:
    string;

  vehicleId:
    string;

  vehicleRegistration:
    string | null;

  vehicleNickname:
    string | null;

  tripId:
    string | null;

  firstRecordedAt:
    string;

  lastRecordedAt:
    string;

  rowCount:
    number | string;

  status:
    "pending" | "verified" | "failed";

  verifiedAt:
    string | null;

  prunedAt:
    string | null;

  prunedRowCount:
    number | string | null;

  createdAt:
    string;
};


type ManifestListResponse = {
  items:
    ManifestListItem[];

  pagination: {
    page:
      number;

    pageSize:
      number;

    total:
      number;

    totalPages:
      number;
  };
};


type DetailEligibility =
  | {
      state:
        "not_applicable";

      reason:
        string;
    }
  | {
      state:
        "assessed";

      eligible:
        boolean;

      reason:
        string | null;
    }
  | {
      state:
        "already_pruned";

      prunedAt:
        string;

      prunedRowCount:
        number | string;
    };


type ManifestDetailResponse = {
  manifest: {
    manifestId:
      string;

    vehicleId:
      string;

    vehicleRegistration:
      string | null;

    vehicleNickname:
      string | null;

    tripId:
      string | null;

    archiveFormat:
      string;

    objectKey:
      string;

    firstRecordedAt:
      string;

    lastRecordedAt:
      string;

    rowCount:
      number | string;

    sha256:
      string;

    status:
      "pending" | "verified" | "failed";

    verifiedAt:
      string | null;

    failureReason:
      string | null;

    prunedAt:
      string | null;

    prunedRowCount:
      number | string | null;

    createdAt:
      string;

    updatedAt:
      string;
  };

  eligibility:
    DetailEligibility;
};


type PruneResult = {
  success:
    boolean;

  executed:
    boolean;

  manifestId:
    string;

  reason?:
    string;

  deletedRowCount?:
    number;

  durableRetry?:
    boolean;
};


function formatDate(
  value:
    string | null
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleString();
}


function vehicleLabel(
  item:
    Pick<
      ManifestListItem,
      "vehicleRegistration" |
      "vehicleNickname" |
      "vehicleId"
    >
) {
  return (
    item.vehicleNickname ||
    item.vehicleRegistration ||
    item.vehicleId
  );
}


export default function ArchiveManifestAdminPage() {

  const [
    listItems,
    setListItems,
  ] =
    useState<
      ManifestListItem[]
    >([]);

  const [
    listLoading,
    setListLoading,
  ] =
    useState(true);

  const [
    listError,
    setListError,
  ] =
    useState("");

  const [
    page,
    setPage,
  ] =
    useState(1);

  const [
    pageSize,
    setPageSize,
  ] =
    useState(50);

  const [
    totalPages,
    setTotalPages,
  ] =
    useState(0);

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState("");

  const [
    pruneStateFilter,
    setPruneStateFilter,
  ] =
    useState("all");

  const [
    vehicleFilter,
    setVehicleFilter,
  ] =
    useState("");

  const [
    selectedManifestId,
    setSelectedManifestId,
  ] =
    useState<string | null>(
      null
    );

  const [
    detail,
    setDetail,
  ] =
    useState<
      ManifestDetailResponse | null
    >(null);

  const [
    detailLoading,
    setDetailLoading,
  ] =
    useState(false);

  const [
    detailError,
    setDetailError,
  ] =
    useState("");

  const [
    confirmationText,
    setConfirmationText,
  ] =
    useState("");

  const [
    prunePending,
    setPrunePending,
  ] =
    useState(false);

  const [
    pruneError,
    setPruneError,
  ] =
    useState("");

  const [
    pruneResult,
    setPruneResult,
  ] =
    useState<
      PruneResult | null
    >(null);


  const loadList =
    useCallback(
      async () => {
        setListLoading(true);
        setListError("");

        try {
          const params =
            new URLSearchParams();

          params.set(
            "page",
            String(page)
          );

          params.set(
            "pageSize",
            String(pageSize)
          );

          params.set(
            "pruneState",
            pruneStateFilter
          );

          if (statusFilter) {
            params.set(
              "status",
              statusFilter
            );
          }

          if (
            vehicleFilter.trim()
          ) {
            params.set(
              "vehicleId",
              vehicleFilter.trim()
            );
          }

          const response =
            await fetchWithAuth(
              `/api/fleet/vehicle-location-archive/manifests?${params.toString()}`,
              {
                method:
                  "GET",
              }
            );

          const result =
            await response.json();

          if (!response.ok) {
            throw new Error(
              result.error ||
              "Failed to load archive manifests."
            );
          }

          const data =
            result as ManifestListResponse;

          setListItems(
            data.items || []
          );

          setTotalPages(
            data.pagination?.totalPages ??
            0
          );
        }
        catch (error) {
          setListItems([]);

          setTotalPages(0);

          setListError(
            error instanceof Error
              ? error.message
              : "Failed to load archive manifests."
          );
        }
        finally {
          setListLoading(false);
        }
      },
      [
        page,
        pageSize,
        pruneStateFilter,
        statusFilter,
        vehicleFilter,
      ]
    );


  const loadDetail =
    useCallback(
      async (
        manifestId:
          string,
        options?:
          {
            preservePruneResult?:
              boolean;
          }
      ) => {
        setSelectedManifestId(
          manifestId
        );

        setDetail(null);
        setDetailLoading(true);
        setDetailError("");
        setConfirmationText("");
        setPruneError("");

        if (
          !options?.preservePruneResult
        ) {
          setPruneResult(null);
        }

        try {
          const response =
            await fetchWithAuth(
              `/api/fleet/vehicle-location-archive/manifests/${encodeURIComponent(manifestId)}`,
              {
                method:
                  "GET",
              }
            );

          const result =
            await response.json();

          if (!response.ok) {
            throw new Error(
              result.error ||
              "Failed to load archive manifest detail."
            );
          }

          setDetail(
            result as ManifestDetailResponse
          );
        }
        catch (error) {
          setDetailError(
            error instanceof Error
              ? error.message
              : "Failed to load archive manifest detail."
          );
        }
        finally {
          setDetailLoading(false);
        }
      },
      []
    );


  useEffect(
    () => {
      void loadList();
    },
    [
      loadList,
    ]
  );


  const canPrune =
    useMemo(
      () =>
        detail?.eligibility.state ===
          "assessed" &&
        detail.eligibility.eligible ===
          true,
      [
        detail,
      ]
    );


  async function copyText(
    value:
      string
  ) {
    await navigator.clipboard.writeText(
      value
    );
  }


  async function pruneSelectedManifest() {

    if (
      !detail ||
      !canPrune ||
      confirmationText !==
        CONFIRMATION
    ) {
      return;
    }

    setPrunePending(true);
    setPruneError("");
    setPruneResult(null);

    try {
      const response =
        await fetchWithAuth(
          "/api/fleet/vehicle-location-archive/prune",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                manifestId:
                  detail.manifest.manifestId,

                confirmation:
                  confirmationText,
              }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
          result.reason ||
          "Failed to prune archived vehicle locations."
        );
      }

      const prune =
        result as PruneResult;

      setPruneResult(
        prune
      );

      setConfirmationText("");

      await loadDetail(
        detail.manifest.manifestId,
        {
          preservePruneResult:
            true,
        }
      );

      await loadList();
    }
    catch (error) {
      setPruneError(
        error instanceof Error
          ? error.message
          : "Failed to prune archived vehicle locations."
      );
    }
    finally {
      setPrunePending(false);
    }
  }


  return (
    <AppShell>
      <div
        style={{
          display:
            "grid",
          gap:
            24,
        }}
      >
        <section
          style={{
            borderRadius:
              24,
            padding:
              28,
            background:
              "#0f172a",
            color:
              "#ffffff",
          }}
        >
          <div
            style={{
              fontSize:
                13,
              fontWeight:
                800,
              letterSpacing:
                "0.08em",
              opacity:
                0.7,
            }}
          >
            HARBORGUARD ARCHIVE OPERATIONS
          </div>

          <h1
            style={{
              margin:
                "10px 0 0",
              fontSize:
                38,
            }}
          >
            Vehicle Location Archive Manifests
          </h1>

          <p
            style={{
              color:
                "#cbd5e1",
              maxWidth:
                900,
              lineHeight:
                1.6,
            }}
          >
            Review immutable archive evidence before any
            verified hot-telemetry prune. Archive metadata is
            read through HarborGuard's authenticated APIs only.
          </p>
        </section>


        <section
          style={{
            border:
              "1px solid #e5e7eb",
            borderRadius:
              18,
            padding:
              20,
            background:
              "#ffffff",
          }}
        >
          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(180px,1fr))",
              gap:
                12,
            }}
          >
            <select
              value={
                statusFilter
              }
              onChange={
                (event) => {
                  setStatusFilter(
                    event.target.value
                  );
                  setPage(1);
                }
              }
            >
              <option value="">
                All statuses
              </option>

              <option value="pending">
                Pending
              </option>

              <option value="verified">
                Verified
              </option>

              <option value="failed">
                Failed
              </option>
            </select>

            <select
              value={
                pruneStateFilter
              }
              onChange={
                (event) => {
                  setPruneStateFilter(
                    event.target.value
                  );
                  setPage(1);
                }
              }
            >
              <option value="all">
                All prune states
              </option>

              <option value="unpruned">
                Unpruned
              </option>

              <option value="pruned">
                Pruned
              </option>
            </select>

            <input
              value={
                vehicleFilter
              }
              onChange={
                (event) =>
                  setVehicleFilter(
                    event.target.value
                  )
              }
              placeholder="Vehicle UUID filter"
            />

            <select
              value={
                pageSize
              }
              onChange={
                (event) => {
                  setPageSize(
                    Number(
                      event.target.value
                    )
                  );
                  setPage(1);
                }
              }
            >
              <option value={25}>
                25 rows
              </option>

              <option value={50}>
                50 rows
              </option>

              <option value={100}>
                100 rows
              </option>
            </select>

            <button
              type="button"
              onClick={
                () =>
                  void loadList()
              }
              disabled={
                listLoading
              }
            >
              {listLoading
                ? "Refreshing..."
                : "Refresh"}
            </button>
          </div>

          {listError ? (
            <p
              style={{
                color:
                  "#b91c1c",
                fontWeight:
                  700,
              }}
            >
              {listError}
            </p>
          ) : null}
        </section>


        <div
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "minmax(0,1.5fr) minmax(340px,0.8fr)",
            gap:
              20,
            alignItems:
              "start",
          }}
        >
          <section
            style={{
              border:
                "1px solid #e5e7eb",
              borderRadius:
                18,
              background:
                "#ffffff",
              overflowX:
                "auto",
            }}
          >
            {listLoading ? (
              <div
                style={{
                  padding:
                    24,
                }}
              >
                Loading archive manifests...
              </div>
            ) : listItems.length === 0 ? (
              <div
                style={{
                  padding:
                    24,
                }}
              >
                No archive manifests found.
              </div>
            ) : (
              <table
                style={{
                  width:
                    "100%",
                  borderCollapse:
                    "collapse",
                }}
              >
                <thead>
                  <tr>
                    {[
                      "Vehicle",
                      "Trip",
                      "Archive Range",
                      "Rows",
                      "Status",
                      "Verified",
                      "Prune State",
                      "Created",
                      "Action",
                    ].map(
                      (heading) => (
                        <th
                          key={
                            heading
                          }
                          style={{
                            textAlign:
                              "left",
                            padding:
                              12,
                            borderBottom:
                              "1px solid #e5e7eb",
                          }}
                        >
                          {heading}
                        </th>
                      )
                    )}
                  </tr>
                </thead>

                <tbody>
                  {listItems.map(
                    (item) => (
                      <tr
                        key={
                          item.manifestId
                        }
                      >
                        <td
                          style={{
                            padding:
                              12,
                          }}
                        >
                          {vehicleLabel(
                            item
                          )}
                        </td>

                        <td
                          style={{
                            padding:
                              12,
                          }}
                        >
                          {item.tripId ||
                            "—"}
                        </td>

                        <td
                          style={{
                            padding:
                              12,
                          }}
                        >
                          {formatDate(
                            item.firstRecordedAt
                          )}
                          {" → "}
                          {formatDate(
                            item.lastRecordedAt
                          )}
                        </td>

                        <td
                          style={{
                            padding:
                              12,
                          }}
                        >
                          {String(
                            item.rowCount
                          )}
                        </td>

                        <td
                          style={{
                            padding:
                              12,
                          }}
                        >
                          {item.status}
                        </td>

                        <td
                          style={{
                            padding:
                              12,
                          }}
                        >
                          {formatDate(
                            item.verifiedAt
                          )}
                        </td>

                        <td
                          style={{
                            padding:
                              12,
                          }}
                        >
                          {item.prunedAt
                            ? "Pruned"
                            : "Unpruned"}
                        </td>

                        <td
                          style={{
                            padding:
                              12,
                          }}
                        >
                          {formatDate(
                            item.createdAt
                          )}
                        </td>

                        <td
                          style={{
                            padding:
                              12,
                          }}
                        >
                          <button
                            type="button"
                            onClick={
                              () =>
                                void loadDetail(
                                  item.manifestId
                                )
                            }
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            )}

            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                padding:
                  16,
                borderTop:
                  "1px solid #e5e7eb",
              }}
            >
              <button
                type="button"
                disabled={
                  page <= 1 ||
                  listLoading
                }
                onClick={
                  () =>
                    setPage(
                      (value) =>
                        Math.max(
                          1,
                          value - 1
                        )
                    )
                }
              >
                Previous
              </button>

              <span>
                Page {page} of{" "}
                {Math.max(
                  totalPages,
                  1
                )}
              </span>

              <button
                type="button"
                disabled={
                  listLoading ||
                  totalPages === 0 ||
                  page >= totalPages
                }
                onClick={
                  () =>
                    setPage(
                      (value) =>
                        value + 1
                    )
                }
              >
                Next
              </button>
            </div>
          </section>


          <aside
            style={{
              border:
                "1px solid #e5e7eb",
              borderRadius:
                18,
              padding:
                20,
              background:
                "#ffffff",
              position:
                "sticky",
              top:
                16,
            }}
          >
            {!selectedManifestId ? (
              <p>
                Select a manifest to inspect its archive evidence.
              </p>
            ) : detailLoading ? (
              <p>
                Loading manifest detail...
              </p>
            ) : detailError ? (
              <p
                style={{
                  color:
                    "#b91c1c",
                  fontWeight:
                    700,
                }}
              >
                {detailError}
              </p>
            ) : detail ? (
              <div
                style={{
                  display:
                    "grid",
                  gap:
                    20,
                }}
              >
                <section>
                  <h2>
                    Archive Identity
                  </h2>

                  <p>
                    Manifest:{" "}
                    <code>
                      {
                        detail.manifest
                          .manifestId
                      }
                    </code>
                  </p>

                  <p>
                    Format:{" "}
                    {
                      detail.manifest
                        .archiveFormat
                    }
                  </p>

                  <p>
                    Object key:{" "}
                    <code>
                      {
                        detail.manifest
                          .objectKey
                      }
                    </code>
                  </p>

                  <button
                    type="button"
                    onClick={
                      () =>
                        void copyText(
                          detail.manifest
                            .objectKey
                        )
                    }
                  >
                    Copy object key
                  </button>
                </section>


                <section>
                  <h3>
                    Vehicle
                  </h3>

                  <p>
                    {
                      detail.manifest
                        .vehicleNickname ||
                      detail.manifest
                        .vehicleRegistration ||
                      detail.manifest
                        .vehicleId
                    }
                  </p>

                  <p>
                    Trip:{" "}
                    {
                      detail.manifest
                        .tripId ||
                      "—"
                    }
                  </p>
                </section>


                <section>
                  <h3>
                    Evidence Window
                  </h3>

                  <p>
                    {formatDate(
                      detail.manifest
                        .firstRecordedAt
                    )}
                    {" → "}
                    {formatDate(
                      detail.manifest
                        .lastRecordedAt
                    )}
                  </p>

                  <p>
                    Rows:{" "}
                    {String(
                      detail.manifest
                        .rowCount
                    )}
                  </p>
                </section>


                <section>
                  <h3>
                    Integrity
                  </h3>

                  <p>
                    SHA-256:
                  </p>

                  <code
                    style={{
                      overflowWrap:
                        "anywhere",
                    }}
                  >
                    {
                      detail.manifest
                        .sha256
                    }
                  </code>

                  <div>
                    <button
                      type="button"
                      onClick={
                        () =>
                          void copyText(
                            detail.manifest
                              .sha256
                          )
                      }
                    >
                      Copy SHA-256
                    </button>
                  </div>
                </section>


                <section>
                  <h3>
                    Lifecycle
                  </h3>

                  <p>
                    Status:{" "}
                    {
                      detail.manifest
                        .status
                    }
                  </p>

                  <p>
                    Verified:{" "}
                    {formatDate(
                      detail.manifest
                        .verifiedAt
                    )}
                  </p>

                  <p>
                    Failure reason:{" "}
                    {
                      detail.manifest
                        .failureReason ||
                      "—"
                    }
                  </p>

                  <p>
                    Pruned:{" "}
                    {formatDate(
                      detail.manifest
                        .prunedAt
                    )}
                  </p>

                  <p>
                    Pruned rows:{" "}
                    {
                      detail.manifest
                        .prunedRowCount ===
                      null
                        ? "—"
                        : String(
                            detail.manifest
                              .prunedRowCount
                          )
                    }
                  </p>
                </section>


                <section>
                  <h3>
                    Pruning Eligibility
                  </h3>

                  <p>
                    State:{" "}
                    {
                      detail.eligibility
                        .state
                    }
                  </p>

                  {detail.eligibility
                    .state ===
                  "assessed" ? (
                    <>
                      <p>
                        Eligible:{" "}
                        {detail.eligibility
                          .eligible
                          ? "Yes"
                          : "No"}
                      </p>

                      <p>
                        Reason:{" "}
                        {
                          detail.eligibility
                            .reason ||
                          "—"
                        }
                      </p>
                    </>
                  ) : null}

                  {detail.eligibility
                    .state ===
                  "not_applicable" ? (
                    <p>
                      Reason:{" "}
                      {
                        detail.eligibility
                          .reason
                      }
                    </p>
                  ) : null}
                </section>


                {canPrune ? (
                  <section
                    style={{
                      border:
                        "1px solid #fecaca",
                      borderRadius:
                        14,
                      padding:
                        16,
                      background:
                        "#fff7f7",
                    }}
                  >
                    <h3>
                      Destructive Prune
                    </h3>

                    <p>
                      This permanently removes verified hot
                      vehicle-location rows represented by this
                      immutable archive manifest.
                    </p>

                    <p>
                      Type exactly:
                    </p>

                    <code>
                      {CONFIRMATION}
                    </code>

                    <input
                      value={
                        confirmationText
                      }
                      onChange={
                        (event) =>
                          setConfirmationText(
                            event.target.value
                          )
                      }
                      autoComplete="off"
                      spellCheck={false}
                      style={{
                        width:
                          "100%",
                        marginTop:
                          10,
                      }}
                    />

                    <button
                      type="button"
                      disabled={
                        confirmationText !==
                          CONFIRMATION ||
                        prunePending
                      }
                      onClick={
                        () =>
                          void pruneSelectedManifest()
                      }
                      style={{
                        marginTop:
                          12,
                      }}
                    >
                      {prunePending
                        ? "Pruning..."
                        : "Prune verified archive"}
                    </button>
                  </section>
                ) : null}


                {pruneError ? (
                  <p
                    style={{
                      color:
                        "#b91c1c",
                      fontWeight:
                        700,
                    }}
                  >
                    {pruneError}
                  </p>
                ) : null}


                {pruneResult ? (
                  <section
                    style={{
                      border:
                        "1px solid #bbf7d0",
                      borderRadius:
                        14,
                      padding:
                        16,
                    }}
                  >
                    <h3>
                      Prune Result
                    </h3>

                    <p>
                      Executed:{" "}
                      {pruneResult.executed
                        ? "Yes"
                        : "No"}
                    </p>

                    <p>
                      Deleted rows:{" "}
                      {pruneResult.deletedRowCount ??
                        0}
                    </p>

                    <p>
                      Durable retry:{" "}
                      {pruneResult.durableRetry
                        ? "Yes"
                        : "No"}
                    </p>

                    <Link href="/admin/audit-logs">
                      View audit logs
                    </Link>
                  </section>
                ) : null}
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </AppShell>
  );
}