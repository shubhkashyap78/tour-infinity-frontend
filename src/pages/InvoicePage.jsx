import { useEffect, useState } from "react";
import { apiFetch } from "../api";

const GST_RATE = 0.15;
const VAT_REG_NO = "VAT27223119";

const fmtDate = (v) =>
  v ? new Date(v).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fmtMoney = (currency, amount) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(amount || 0);

// Standalone invoice HTML — rendered off-screen for capture
function InvoiceDocument({ booking }) {
  const bk = booking;
  return (
    <div
      id="invoice-capture"
      style={{
        width: 794,
        background: "#fff",
        fontFamily: "Georgia, 'Times New Roman', serif",
        color: "#1d1a15",
        padding: "40px 48px",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "3px solid #1d1a15", paddingBottom: 20, marginBottom: 24 }}>
        <div>
          <img
            src="/assests/logo.png"
            alt="logo"
            crossOrigin="anonymous"
            style={{ width: 64, height: 64, objectFit: "contain", borderRadius: 10, marginBottom: 10, display: "block" }}
          />
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 1 }}>Andaman Tour Infinity</div>
          <div style={{ fontSize: 13, color: "#6b5b4a", marginTop: 2 }}>Mauritius Travel &amp; Tours</div>
          <div style={{ marginTop: 4, fontSize: 12, color: "#6b5b4a", fontWeight: 700 }}>VAT Reg No: {VAT_REG_NO}</div>
          <div style={{ marginTop: 10, fontSize: 12, color: "#6b5b4a", lineHeight: 1.8 }}>
            <div>📍 Mauritius, Indian Ocean</div>
            <div>📞 +230 5729 2475</div>
            <div>📞 +230 5793 9800</div>
            <div>✉️ info@andamantourinfinity.com</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 42, fontWeight: 800, color: "#b84a2b", letterSpacing: 3 }}>INVOICE</div>
          <div style={{ fontSize: 13, color: "#6b5b4a", marginTop: 4 }}>#{bk.bookingRef || bk._id}</div>
          <div style={{ fontSize: 12, color: "#9b8b7a", marginTop: 2 }}>Date: {fmtDate(bk.createdAt)}</div>
        </div>
      </div>

      {/* From / Bill To */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: "#9b8b7a", marginBottom: 6, fontWeight: 700 }}>FROM</div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Andaman Tour Infinity</div>
          <div style={{ fontSize: 12, color: "#6b5b4a", lineHeight: 1.8 }}>
            <div>Mauritius, Indian Ocean</div>
            <div>+230 5729 2475 / +230 5793 9800</div>
            <div>info@andamantourinfinity.com</div>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: "#9b8b7a", marginBottom: 6, fontWeight: 700 }}>BILL TO</div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{bk.customerName}</div>
          <div style={{ fontSize: 12, color: "#6b5b4a", lineHeight: 1.8 }}>
            <div>{bk.customerEmail}</div>
            <div>{bk.customerPhone || "—"}</div>
          </div>
        </div>
      </div>

      {/* Meta Row */}
      <div style={{ display: "flex", border: "1px solid #e2cbb3", borderRadius: 10, overflow: "hidden", marginBottom: 24 }}>
        {[
          ["Check In",       fmtDate(bk.checkIn)],
          ["Check Out",      fmtDate(bk.checkOut)],
          ["Guests",         bk.guests || 1],
          ["Booking Status", bk.status],
          ["Payment",        bk.paymentStatus],
        ].map(([label, val], i, arr) => (
          <div key={label} style={{ flex: 1, padding: "10px 14px", borderRight: i < arr.length - 1 ? "1px solid #e2cbb3" : "none" }}>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1, color: "#9b8b7a" }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 700, marginTop: 3 }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 0 }}>
        <thead>
          <tr style={{ background: "#1d1a15", color: "#fff" }}>
            {["#", "Description", "Type", "Guests", "Amount"].map((h, i) => (
              <th key={h} style={{ padding: "10px 14px", textAlign: i === 4 ? "right" : "left", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr style={{ background: "#fffdf8" }}>
            <td style={{ padding: "12px 14px", borderBottom: "1px solid #ede0d0" }}>1</td>
            <td style={{ padding: "12px 14px", borderBottom: "1px solid #ede0d0" }}>{bk.product?.title || "—"}</td>
            <td style={{ padding: "12px 14px", borderBottom: "1px solid #ede0d0" }}>
              <span style={{ background: "#f0e6d8", padding: "2px 8px", borderRadius: 20, fontSize: 11 }}>{bk.productType}</span>
            </td>
            <td style={{ padding: "12px 14px", borderBottom: "1px solid #ede0d0" }}>{bk.guests || 1}</td>
            <td style={{ padding: "12px 14px", borderBottom: "1px solid #ede0d0", textAlign: "right", fontWeight: 700 }}>{fmtMoney(bk.currency, bk.totalAmount)}</td>
          </tr>
        </tbody>
      </table>

      {/* Total */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 24 }}>
        <div style={{ minWidth: 260, border: "1px solid #e2cbb3", borderTop: "none", borderRadius: "0 0 10px 10px", overflow: "hidden" }}>
          {(() => {
            const subtotal = bk.totalAmount / (1 + GST_RATE);
            const gst = bk.totalAmount - subtotal;
            return (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 14px", fontSize: 13, borderBottom: "1px solid #f0e6d8" }}>
                  <span>Subtotal</span><span>{fmtMoney(bk.currency, subtotal)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 14px", fontSize: 13, borderBottom: "1px solid #f0e6d8", color: "#6b5b4a" }}>
                  <span>VAT (15%) — VAT Reg: {VAT_REG_NO}</span><span>{fmtMoney(bk.currency, gst)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px", background: "#1d1a15", color: "#fff", fontSize: 15, fontWeight: 700 }}>
                  <span>TOTAL (incl. VAT)</span><span style={{ color: "#f4a261" }}>{fmtMoney(bk.currency, bk.totalAmount)}</span>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Notes */}
      {bk.notes && (
        <div style={{ padding: "14px 16px", background: "#fdf6ee", border: "1px solid #e2cbb3", borderRadius: 10, marginBottom: 24 }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: "#9b8b7a", marginBottom: 6, fontWeight: 700 }}>Notes</div>
          <div style={{ fontSize: 13, color: "#4a3f35", lineHeight: 1.7 }}>{bk.notes}</div>
        </div>
      )}

      {/* Footer */}
      <div style={{ borderTop: "1px solid #e2cbb3", paddingTop: 16, textAlign: "center", fontSize: 12, color: "#9b8b7a" }}>
        Thank you for choosing Andaman Tour Infinity — Mauritius Travel &amp; Tours
      </div>
    </div>
  );
}

export default function InvoicePage({ bookingId, token, onClose }) {
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    apiFetch(`/api/bookings/${bookingId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => { setBooking(d); setLoading(false); })
      .catch(() => { setError("Failed to load booking."); setLoading(false); });
  }, [bookingId]);

  const handlePrint = () => window.print();

  const handleWhatsApp = () => {
    if (!booking) return;
    const bk = booking;
    const subtotal = bk.totalAmount / (1 + GST_RATE);
    const gst = bk.totalAmount - subtotal;
    const msg = [
      `*INVOICE — Andaman Tour Infinity*`,
      `📋 Ref: ${bk.bookingRef || bk._id}`,
      `📅 Date: ${fmtDate(bk.createdAt)}`,
      ``,
      `*Customer:* ${bk.customerName}`,
      `*Product:* ${bk.product?.title || "—"}`,
      `*Type:* ${bk.productType}`,
      `*Check In:* ${fmtDate(bk.checkIn)}`,
      `*Check Out:* ${fmtDate(bk.checkOut)}`,
      `*Guests:* ${bk.guests || 1}`,
      ``,
      `*Subtotal:* ${fmtMoney(bk.currency, subtotal)}`,
      `*VAT (15%):* ${fmtMoney(bk.currency, gst)}`,
      `*Total (incl. GST):* ${fmtMoney(bk.currency, bk.totalAmount)}`,
      `*VAT Reg No:* ${VAT_REG_NO}`,
      `*Payment Status:* ${bk.paymentStatus}`,
      ``,
      `Thank you for choosing Andaman Tour Infinity 🌴`,
      `+230 5729 2475 | +230 5793 9800`,
    ].join("\n");
    const phone = bk.customerPhone?.replace(/[^0-9]/g, "");
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  const handleDownloadPdf = async () => {
    if (!booking || downloading) return;
    setDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      // Render off-screen capture div
      const wrapper = document.createElement("div");
      wrapper.style.cssText = "position:fixed;left:-9999px;top:0;z-index:-1;";
      document.body.appendChild(wrapper);

      const { createRoot } = await import("react-dom/client");
      const root = createRoot(wrapper);

      await new Promise((resolve) => {
        root.render(<InvoiceDocument booking={booking} />);
        // Wait for fonts + image to load
        setTimeout(resolve, 600);
      });

      const element = wrapper.querySelector("#invoice-capture");
      const canvas = await html2canvas(element, {
        scale: 1.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: element.offsetWidth,
        height: element.offsetHeight,
        windowWidth: element.offsetWidth,
      });

      root.unmount();
      document.body.removeChild(wrapper);

      const imgData = canvas.toDataURL("image/jpeg", 0.85);
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * pageW) / canvas.width;

      let heightLeft = imgH;
      let position = 0;
      pdf.addImage(imgData, "JPEG", 0, position, pageW, imgH);
      heightLeft -= pageH;
      while (heightLeft > 0) {
        position -= pageH;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, pageW, imgH);
        heightLeft -= pageH;
      }

      pdf.save(`invoice-${booking.bookingRef || booking._id}.pdf`);
    } catch (e) {
      console.error("PDF error:", e);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="inv-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="inv-modal">

        {/* Modal Header */}
        <div className="inv-modal-header">
          <span>Invoice Preview</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-secondary" onClick={handlePrint} disabled={!booking}>🖨️ Print</button>
            <button className="btn-primary" onClick={handleDownloadPdf} disabled={!booking || downloading}>
              {downloading ? "⏳ Generating..." : "⬇️ PDF"}
            </button>
            <button className="inv-wa-btn" onClick={handleWhatsApp} disabled={!booking} title="Send via WhatsApp">
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Send
            </button>
            <button className="btn-close" onClick={onClose}>✕</button>
          </div>
        </div>

        {loading && <p className="empty" style={{ padding: 32, textAlign: "center" }}>⏳ Loading...</p>}
        {error && <div className="modal-error" style={{ margin: 16 }}>{error}</div>}

        {booking && (
          <div className="inv-body" id="invoice-print-area">
            <InvoiceDocument booking={booking} />
          </div>
        )}
      </div>
    </div>
  );
}
