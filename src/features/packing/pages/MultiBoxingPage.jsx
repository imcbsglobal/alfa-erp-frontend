import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getBoxingData, completeBoxing, getCouriers } from "../../../services/sales";
import { useAuth } from "../../auth/AuthContext";
import toast from "react-hot-toast";

const transliterateToMalayalam = async (text) => {
  try {
    const res = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ml&dt=t&q=${encodeURIComponent(text)}`
    );
    const data = await res.json();
    if (data?.[0]) return data[0].map(s => s?.[0] || "").join("").trim();
    return "";
  } catch { return ""; }
};

export default function MultiBoxingPage() {
  const GROUP_ADDR_BY_GROUP_KEY = "packing.groupAddressByGroupId";
  const GROUP_ADDR_BY_INVOICES_KEY = "packing.groupAddressByInvoices";

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, menus } = useAuth();

  const invoiceNos = searchParams.get("invoices")?.split(",").filter(Boolean) || [];
  const groupedInvoiceCount = invoiceNos.length;

  const [loading, setLoading] = useState(true);
  const [allData, setAllData] = useState([]);
  const [labelCount, setLabelCount] = useState(1);
  const [selectedAddressIndex, setSelectedAddressIndex] = useState(0);
  const [printing, setPrinting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [couriers, setCouriers] = useState([]);
  const [selectedCourier, setSelectedCourier] = useState(null);

  const getPath = (path) => {
    const isOpsUser = ["PICKER", "PACKER", "BILLER", "DELIVERY", "STORE"].includes(user?.role);
    return isOpsUser ? `/ops${path}` : path;
  };

  const saveGroupAddressPreference = (boxingGroupId, preferredInvoiceNo) => {
    try {
      if (!preferredInvoiceNo) return;

      const invoiceSetKey = [...invoiceNos].sort().join(",");

      if (boxingGroupId) {
        const byGroup = JSON.parse(localStorage.getItem(GROUP_ADDR_BY_GROUP_KEY) || "{}");
        byGroup[boxingGroupId] = preferredInvoiceNo;
        localStorage.setItem(GROUP_ADDR_BY_GROUP_KEY, JSON.stringify(byGroup));
      }

      if (invoiceSetKey) {
        const byInvoices = JSON.parse(localStorage.getItem(GROUP_ADDR_BY_INVOICES_KEY) || "{}");
        byInvoices[invoiceSetKey] = preferredInvoiceNo;
        localStorage.setItem(GROUP_ADDR_BY_INVOICES_KEY, JSON.stringify(byInvoices));
      }
    } catch {
      // Ignore storage errors and continue boxing flow.
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const results = await Promise.all(
          invoiceNos.map(no => getBoxingData(no).then(res => ({ no, data: res.data?.data || res.data })))
        );
        setAllData(results);
        setSelectedAddressIndex(0); // Default to first invoice's address
      } catch (err) {
        console.error("Failed to load multi-boxing data", err);
        toast.error("Failed to load invoices");
        navigate(getPath("/packing/boxing"));
      } finally { setLoading(false); }
    };
    if (invoiceNos.length > 0) load();
  }, []);

  useEffect(() => {
    getCouriers({ status: "ACTIVE" })
      .then(res => {
        const list = res.data?.data || res.data?.results || [];
        setCouriers(Array.isArray(list) ? list : []);
      })
      .catch(() => {});
  }, []);

  const handlePrintLabels = async () => {
    if (allData.length === 0) return;
    setPrinting(true);
    try {
      const selectedResult = allData[selectedAddressIndex];
      const invoiceNo = selectedResult.no;
      saveGroupAddressPreference(null, invoiceNo);
      const data = selectedResult.data;
      const invoice = data?.invoice || data;
      const customer = invoice?.customer || data?.customer || {};

      const customerName = customer.name || invoice?.customer_name || "";
      const customerArea = customer.area || "";
      const customerAddr1 = customer.address1 || invoice?.delivery_address || "";
      const customerAddr2 = customer.address2 || "";
      const customerAddr3 = customer.address3 || "";
      const customerPincode = customer.pincode || "";
      const customerPhone1 = customer.phone1 || invoice?.customer_phone || "";
      const customerPhone2 = customer.phone2 || "";
      const groupedInvoicesParam = encodeURIComponent(invoiceNos.join(","));
      const qrUrl = `${window.location.origin}/invoice/${invoiceNo}?invoices=${groupedInvoicesParam}`;

      let customerNameML = "";
      if (customerName) {
        try { customerNameML = await transliterateToMalayalam(customerName); } catch { customerNameML = ""; }
      }

      const labelHtmlParts = [];
      const qrScriptParts = [];

      for (let idx = 0; idx < labelCount; idx++) {
        labelHtmlParts.push(`
          <div class="label-container${idx < labelCount - 1 ? " page-break" : ""}">
            <div class="main-content">
              <div class="customer-qr-section">
                <div class="customer-info">
                  <p class="to-label">Ship To</p>
                  ${customerName   ? `<p class="customer-name">${customerName}</p>` : ""}
                  ${customerNameML ? `<p class="customer-name-ml">${customerNameML}</p>` : ""}
                  ${(customerAddr1 || customerAddr2) ? `<p class="customer-area">${[customerAddr1, customerAddr2].filter(Boolean).join(" ")}</p>` : ""}
                  ${(customerAddr3 || customerPincode) ? `<p class="customer-addr">${[customerAddr3, customerPincode].filter(Boolean).join(" - ")}</p>` : ""}
                  ${(customerPhone1 || customerPhone2) ? `<p class="customer-contact">${[customerPhone1, customerPhone2].filter(Boolean).join(" &nbsp;|&nbsp; ")}</p>` : ""}
                  ${selectedCourier ? `<p class="courier-line">Courier: ${selectedCourier.courier_name}</p>` : ""}
                </div>
                <div class="qr-bottom-row">
                  <div class="qr-block">
                    <p class="inv-no-label">${groupedInvoiceCount > 1 ? `INVOICES: ${groupedInvoiceCount}` : `INV: ${invoiceNo}`}</p>
                    <div class="qr-container">
                      <div id="qrcode-${idx}"></div>
                    </div>
                    <p class="label-count-text">BOX: ${idx + 1}/${labelCount}</p>
                  </div>
                </div>
              </div>
              <div class="icons-column">
                <div class="this-way-up-box">
                  <div class="this-way-up-arrows">
                    <svg class="arrow-svg" viewBox="0 0 8 11" fill="black"><polygon points="4,0 8,5 5.5,5 5.5,11 2.5,11 2.5,5 0,5"/></svg>
                    <svg class="arrow-svg" viewBox="0 0 8 11" fill="black"><polygon points="4,0 8,5 5.5,5 5.5,11 2.5,11 2.5,5 0,5"/></svg>
                  </div>
                  <span class="icon-label">This Way Up</span>
                </div>
                <div class="icon-item">
                  <span class="icon-emoji">❄️</span>
                  <span class="icon-label">Keep Cold</span>
                </div>
                <div class="icon-item">
                  <span class="icon-emoji">🍷</span>
                  <span class="icon-label">Fragile</span>
                </div>
                <div class="icon-item">
                  <span class="icon-emoji">☂️</span>
                  <span class="icon-label">Keep Dry</span>
                </div>
              </div>
            </div>
            <div class="company-footer">
              <img src="/black.png" alt="Alfa Agencies" class="company-logo" />
              <div class="company-info">
                <span class="company-address">18/1143 A7, Ground Floor, Meyon Building, Jail Road, Calicut - 673 004</span>
                <span class="company-address">Ph: (Off) 0495 2300644, 2701899, 2306728</span>
                <span class="company-address">Ph: (Mob) 9387724365, 7909220300, 7909220400</span>
              </div>
            </div>
          </div>
        `);
        qrScriptParts.push(`
          new QRCode(document.getElementById('qrcode-${idx}'), {
            text: '${qrUrl}',
            width: 95,
            height: 95,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
          });
        `);
      }

      const iframe = document.createElement("iframe");
      iframe.style.position = "absolute";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "none";
      iframe.style.visibility = "hidden";
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      iframeDoc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Address Labels – Multi-Bill</title>
            <style>
              @page { margin: 0; size: 15cm 10cm; }
              * { margin: 0; padding: 0; box-sizing: border-box; }
              html, body { font-family: 'Segoe UI', sans-serif; background: white; color: black; }
              .page-break { page-break-after: always; }
              .label-container {
                width: 15cm; height: 10cm;
                border: 2px solid #000; border-radius: 5px;
                display: flex; flex-direction: column;
                overflow: hidden; background: white;
              }
              .main-content { display: flex; flex: 1; overflow: hidden; }
              .customer-qr-section {
                flex: 1 1 0%; display: flex; flex-direction: column;
                border-right: 1.5px solid #000; overflow: hidden;
                position: relative; min-height: 0;
              }
              .customer-info {
                flex: 1 1 auto; min-height: 0;
                padding: 10px 14px 4px 14px; padding-right: 140px;
                display: flex; flex-direction: column;
                justify-content: flex-start; gap: 1px; overflow: auto;
              }
              .to-label { font-size: 8px; font-weight: bold; text-transform: uppercase; color: #000; letter-spacing: 1px; margin-bottom: 4px; }
              .customer-name { font-weight: bold; font-size: 20px; text-transform: uppercase; color: #000; line-height: 1.2; word-wrap: break-word; }
              .customer-name-ml { font-size: 18px; font-weight: bold; color: #000; line-height: 1.4; margin-top: 2px; word-wrap: break-word; }
              .customer-area { font-size: 13px; color: #000; text-transform: uppercase; letter-spacing: 0.3px; margin-top: 4px; word-wrap: break-word; }
              .customer-addr { font-size: 13px; color: #000; line-height: 1.5; word-wrap: break-word; }
              .customer-contact { font-size: 13px; font-weight: bold; color: #000; margin-top: 4px; word-wrap: break-word; }
              .courier-line { font-size: 11px; font-weight: bold; color: #000; margin-top: 5px; padding: 2px 6px; background: #f0f0f0; border-radius: 3px; display: inline-block; text-transform: uppercase; letter-spacing: 0.4px; }
              .qr-bottom-row { position: absolute; right: 12px; bottom: 8px; background: white; }
              .qr-block { display: flex; flex-direction: column; align-items: center; gap: 3px; }
              .inv-no-label { font-size: 12px; font-weight: bold; color: #000; text-align: center; text-transform: uppercase; letter-spacing: 0.4px; }
              .inv-sub-label { font-size: 9px; font-weight: bold; color: #333; text-align: center; text-transform: uppercase; letter-spacing: 0.3px; }
              .qr-container { border: 1.5px solid #000; padding: 3px; background: white; }
              [id^="qrcode-"] { width: 95px; height: 95px; }
              [id^="qrcode-"] img, [id^="qrcode-"] canvas { width: 95px !important; height: 95px !important; }
              .label-count-text { font-size: 10px; font-weight: bold; color: #000; text-align: center; word-break: break-all; max-width: 105px; }
              .icons-column { width: 1.5cm; flex-shrink: 0; display: flex; flex-direction: column; align-items: center; justify-content: space-evenly; padding: 8px 3px; background: white; }
              .icon-item { display: flex; flex-direction: column; align-items: center; gap: 4px; width: 100%; }
              .icon-label { font-size: 7px; font-weight: bold; text-transform: uppercase; color: #000; letter-spacing: 0.2px; text-align: center; white-space: nowrap; }
              .this-way-up-box { display: flex; flex-direction: column; align-items: center; gap: 2px; width: 100%; }
              .this-way-up-arrows { display: flex; gap: 4px; }
              .arrow-svg { width: 12px; height: 16px; }
              .icon-emoji { font-size: 22px; filter: grayscale(100%) brightness(0); line-height: 1; }
              .company-footer { display: flex; align-items: center; gap: 10px; padding: 6px 10px; border-top: 1.5px solid #000; background: white; flex-shrink: 0; }
              .company-logo { height: 50px; width: auto; image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges; }
              .company-info { display: flex; flex-direction: column; gap: 2px; }
              .company-address { font-size: 12px; color: #000; font-weight: 500; }
              @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact; } }
            </style>
          </head>
          <body>
            ${labelHtmlParts.join("")}
            <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>
            <script>
              window.onload = function() {
                ${qrScriptParts.join("\n")}
                setTimeout(function() {
                  window.print();
                  setTimeout(function() {
                    var iframes = window.parent.document.querySelectorAll('iframe');
                    iframes.forEach(function(f) { try { f.remove(); } catch(e) {} });
                  }, 1000);
                }, 700);
              };
            <\/script>
          </body>
        </html>
      `);
      iframeDoc.close();
      toast.success(`${labelCount} label(s) sent to printer!`);
    } catch (err) {
      console.error("Print error", err);
      toast.error("Failed to print labels");
    } finally { setPrinting(false); }
  };

  const handleCompleteBoxing = async () => {
    try {
      setCompleting(true);
      // Generate a unique boxing group ID for this multi-boxing session
      const boxingGroupId = `BOX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const preferredInvoiceNo = allData[selectedAddressIndex]?.no || invoiceNos[selectedAddressIndex] || invoiceNos[0] || "";
      
      await Promise.all(
        invoiceNos.map(invoiceNo =>
          completeBoxing({
            invoice_no: invoiceNo,
            label_count: labelCount,
            courier_id: selectedCourier?.courier_id || null,
            boxing_group_id: boxingGroupId,
          })
        )
      );

      saveGroupAddressPreference(boxingGroupId, preferredInvoiceNo);

      toast.success(`${invoiceNos.length} invoice(s) boxing complete!`);
      const hasPackingAccess =
        user?.role === "SUPERADMIN" || user?.role === "ADMIN" ||
        menus.some(m =>
          m.url?.includes("packing/invoices") ||
          m.children?.some(c => c.url?.includes("packing/invoices"))
        );
      navigate(getPath(hasPackingAccess ? "/packing/invoices" : "/packing/boxing"));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to complete boxing");
    } finally { setCompleting(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-3 text-gray-600 text-sm">Loading invoice data...</p>
        </div>
      </div>
    );
  }

  if (allData.length === 0) return null;

  const selectedResult = allData[selectedAddressIndex];
  const selectedData = selectedResult?.data;
  const selectedInvoice = selectedData?.invoice || selectedData;
  const selectedCustomer = selectedInvoice?.customer || selectedData?.customer || {};

  const allInvoiceNumbers = allData.map(r => r.no).join(" · ");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-gray-800">Boxing — Print Address Labels</h1>
          <p className="text-xs text-gray-500">
            <span className="font-semibold text-gray-700">{allInvoiceNumbers}</span>
            {allData.length > 0 && <>&nbsp;·&nbsp;{allData.length} bills combined</>}
          </p>
        </div>
        <button onClick={() => navigate(getPath("/packing/boxing"))}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Boxing Queue
        </button>
      </div>

      <div className="px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

          {/* LEFT: Delivery Details for each invoice + Packed Trays */}
          <div className="space-y-5">
            {/* Delivery Details for each invoice */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b bg-gray-50">
                <h2 className="text-sm font-bold text-gray-700">Delivery Details ({allData.length} Bills)</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {allData.map((result, idx) => {
                  const data = result.data;
                  const invoice = data?.invoice || data;
                  const customer = invoice?.customer || data?.customer || {};
                  const trays = data?.trays || data?.boxes || [];

                  return (
                    <div key={idx} className="px-4 py-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-400 font-medium mb-0.5">Invoice</p>
                        <p className="font-mono font-semibold text-gray-800">#{result.no}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-medium mb-0.5">Customer</p>
                        <p className="font-semibold text-gray-800">{customer.name || invoice?.customer_name || "—"}</p>
                      </div>
                      {(customer.area || customer.address1 || invoice?.delivery_address || invoice?.temp_name) && (
                        <div className="col-span-2">
                          <p className="text-xs text-gray-400 font-medium mb-0.5">Address</p>
                          <p className="text-gray-700">
                            {[customer.area, customer.address1 || invoice?.delivery_address || invoice?.temp_name, customer.address2, customer.address3, customer.pincode].filter(Boolean).join(", ")}
                          </p>
                        </div>
                      )}
                      {(customer.phone1 || invoice?.customer_phone) && (
                        <div className="col-span-2">
                          <p className="text-xs text-gray-400 font-medium mb-0.5">Phone</p>
                          <p className="text-gray-700">{customer.phone1 || invoice?.customer_phone}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-gray-400 font-medium mb-0.5">Trays</p>
                        <p className="font-semibold text-teal-700">{trays.length} tray{trays.length !== 1 ? "s" : ""}</p>
                      </div>
                      {idx < allData.length - 1 && <div className="col-span-2 -mx-4 my-2 border-t border-gray-100"></div>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Packed Trays: all trays from all invoices combined */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b bg-gray-50">
                <h2 className="text-sm font-bold text-gray-700">Packed Trays</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {allData.map((invoiceGroup, groupIdx) => {
                  const trays = invoiceGroup.data?.trays || invoiceGroup.data?.boxes || [];
                  return (
                    trays.length > 0 && (
                      <React.Fragment key={groupIdx}>
                        {/* Invoice label */}
                        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                          <p className="text-xs font-semibold text-gray-500 uppercase">Invoice #{invoiceGroup.no}</p>
                        </div>
                        {/* Trays for this invoice */}
                        {trays.map((tray, trayIdx) => (
                          <div key={trayIdx} className="px-4 py-2.5 flex items-center gap-3">
                            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                            </svg>
                            <span className="text-sm font-mono font-semibold text-gray-800">{tray.tray_code || tray.box_id || tray.trayCode}</span>
                            {tray.items?.length > 0 && (
                              <span className="text-xs text-gray-400 ml-auto">{tray.items.length} item{tray.items.length !== 1 ? "s" : ""}</span>
                            )}
                          </div>
                        ))}
                      </React.Fragment>
                    )
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT: Label count + actions */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Address to Print on Label</label>
              <select
                value={selectedAddressIndex}
                onChange={e => setSelectedAddressIndex(parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                {allData.map((result, idx) => {
                  const data = result.data;
                  const invoice = data?.invoice || data;
                  const customer = invoice?.customer || data?.customer || {};
                  const label = `${result.no} · ${customer.name || invoice?.customer_name || "Unknown"}`;
                  return (
                    <option key={idx} value={idx}>
                      {label}
                    </option>
                  );
                })}
              </select>
              <p className="text-xs text-gray-400 mt-1.5">Select which customer address to print on the box label.</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Number of Address Labels to Print</label>
              <div className="flex items-center gap-3">
                <button onClick={() => setLabelCount(v => Math.max(1, v - 1))}
                  className="w-9 h-9 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 text-lg font-bold">−</button>
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={labelCount}
                  onChange={e => {
                    const v = parseInt(e.target.value, 10);
                    setLabelCount(isNaN(v) || v < 1 ? 1 : Math.min(99, v));
                  }}
                  className="w-20 text-center text-lg font-bold border border-gray-300 rounded-lg py-1.5 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
                <button onClick={() => setLabelCount(v => Math.min(99, v + 1))}
                  className="w-9 h-9 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 text-lg font-bold">+</button>
                <span className="text-xs text-gray-400">(1 box default)</span>
              </div>
              <p className="text-xs text-gray-400 mt-1.5">Default = one box. Adjust if extra labels are needed.</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Courier</label>
              <select
                value={selectedCourier?.courier_id || ""}
                onChange={e => setSelectedCourier(couriers.find(c => c.courier_id === e.target.value) || null)}
                className="w-full border border-gray-300 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="">— No Courier —</option>
                {couriers.map(c => (
                  <option key={c.courier_id} value={c.courier_id}>
                    {c.courier_name} {c.courier_code ? `(${c.courier_code})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button onClick={handlePrintLabels} disabled={printing}
                className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {printing
                  ? <><div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />Preparing...</>
                  : <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2z" />
                    </svg>
                    Print {labelCount} Label{labelCount !== 1 ? "s" : ""}
                  </>}
              </button>
              <button onClick={handleCompleteBoxing} disabled={completing}
                className="flex-1 py-2.5 bg-teal-600 text-white text-sm font-bold rounded-lg hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {completing
                  ? <><div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />Completing...</>
                  : <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Complete Boxing
                  </>}
              </button>
            </div>
            <p className="text-xs text-gray-400 text-center">Completing boxing moves all invoices to PACKED status for dispatch.</p>
          </div>

        </div>
      </div>
    </div>
  );
}
