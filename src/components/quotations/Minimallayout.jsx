import { getQuotationView, getCostLines, getCostItems, splitCostLine, htmlToPlainText } from "./quotationLayoutUtils";
import { useState } from "react";
import { EditText, EditArea, LogoEdit, SignatureEdit, CostItemsTable, CustomSectionsEdit, CompanySelect, CustomerSelect, RichOrPlainView } from "./EditableField";

const styles = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

.qd-minimal, .qd-minimal *{
  font-family:'Inter','Segoe UI',Arial,sans-serif;
}

.qd-minimal{
  --ink:#111111; --muted:#6b6b6b; --faint:#9a9a9a; --line:#e5e5e5; --paper:#ffffff; --bg:#fafafa;
  background:var(--bg); color:var(--ink); 
}
.qd-minimal .sheet{ max-width:812px; margin:0 auto; background:var(--paper); }
.qd-minimal .page-frame{ width:100%; border-collapse:collapse; }
.qd-minimal .page-frame > tbody > tr > td{ padding:0 26px; }

.qd-minimal .header{ display:flex; justify-content:space-between; align-items:flex-start; gap:16px; padding-bottom:28px; border-bottom:1px solid var(--ink); flex-wrap:wrap; }
.qd-minimal .brand{ display:flex; align-items:center; gap:12px; }
.qd-minimal .brand img{ height:60px; }
.qd-minimal .brand-name{ font-size:14px; font-weight:500; letter-spacing:.3px; }
.qd-minimal .brand small{ display:block; color:var(--muted); font-weight:400; font-size:12px; margin-top:3px; }
.qd-minimal .doc-meta{ display:flex; align-items:center; gap:8px; margin-top:10px; font-size:13px; color:var(--muted); }
.qd-minimal .doc-meta strong{ color:var(--ink); font-weight:500; }

.qd-minimal .titleblock{ margin:44px 0 36px; }
.qd-minimal .titleblock h1{ margin:0; font-size:46px; font-weight:300; letter-spacing:-1px; }
.qd-minimal .titleblock .subline{ margin-top:6px; font-size:14px; color:var(--muted); }

.qd-minimal .info-grid{ display:grid; grid-template-columns:1fr 1fr; gap:16px 40px; margin-bottom:0; }
.qd-minimal .info-col{ min-width:0; }
.qd-minimal .info-col strong{ display:block; font-size:10.5px; text-transform:uppercase; letter-spacing:1.5px; color:var(--faint); margin-bottom:10px; font-weight:500; }
.qd-minimal .info-col div{ font-size:14px; line-height:1.8; color:var(--ink); }
.qd-minimal .info-col .who-name{ font-weight:500; }

/* ── Unified section styling ───────────────────────────────────────────
   Every content section (Scope, Deliverables, Technology, Project Cost,
   Timeline, Terms & Conditions, Note) shares this same heading + body
   typography so the document reads as one continuous piece, not a set
   of differently-styled components. */
.qd-minimal .block{
  margin-top:0;
  border-radius:14px;
  padding:14px 0;
}
.qd-minimal .block h4{
  font-size:15px;
  text-transform:none;
  letter-spacing:0;
  color:#111111;
  margin:0 0 14px;
  font-weight:700;
  break-after:avoid;
  page-break-after:avoid;
}
.qd-minimal .block .section-body{ font-size:13.5px; line-height:1.9; color:#000000 !important; }
.qd-minimal .block .section-body p{ margin:0; line-height:1.85; color:#000000 !important; }
.qd-minimal .block .section-body ul{ margin:0; padding-left:16px; list-style:disc; }
.qd-minimal .block .section-body li{ margin-bottom:7px; break-inside:avoid; color:#000000 !important; }
.qd-minimal .block .section-body li:last-child{ margin-bottom:0; }



/* Project Cost — plain label/value rows, same font as every other
   section. Only the grand total is set apart, and only with a thin
   top border + bold weight, never a separate card or color. */
.qd-minimal .cost-row{
  display:flex; justify-content:space-between; gap:16px;
  padding:5px 0; font-size:13.5px; line-height:1.9;
  color:#000000 !important;
}
.qd-minimal .cost-row span{
  color:#000000 !important;
}
.qd-minimal .cost-total{
  margin-top:8px; padding-top:10px; border-top:1px solid #d7e3de; font-weight:600;
}

.qd-minimal table.cost-summary{ width:100%; border-collapse:collapse; }
.qd-minimal .cost-summary thead th{ background:#111111; color:#fff; text-align:left; font-size:12px; font-weight:600; padding:8px 10px; border:none; }
.qd-minimal .cost-summary thead th.num{ text-align:right; }
.qd-minimal .cost-summary tbody td{ padding:7px 10px; font-size:13.5px; color:#000000 !important; border-bottom:1px solid #e3ebe7; }
.qd-minimal .cost-summary tbody td.num{ text-align:right; }
.qd-minimal .cost-summary tfoot td{ padding:9px 10px; font-size:13.5px; font-weight:600; border-top:2px solid #111111; }
.qd-minimal .cost-summary tfoot td.num{ text-align:right; }

.qd-minimal .sign{ display:flex; gap:60px; margin-top:0; flex-wrap:wrap; break-inside:avoid; }
.qd-minimal .sign > div{ flex:1; min-width:200px; }
.qd-minimal .sig-box{ min-height:44px; display:flex; align-items:flex-end; }
.qd-minimal .sig-box img{ max-height:38px; }
.qd-minimal .sign-line{ border-top:1px solid var(--ink); margin-top:4px; }
.qd-minimal .sign .who{ color:var(--ink); font-weight:500; margin-top:10px; font-size:13.5px; }
.qd-minimal .sign .label{ color:var(--faint); font-size:11.5px; margin-top:2px; letter-spacing:.3px; }

.qd-minimal .footer-bar{ margin-top:10px; padding-top:10px; border-top:1px solid var(--line); display:flex; justify-content:space-between; flex-wrap:wrap; gap:16px; font-size:11.5px; color:var(--faint); }

@media print {
  @page{ size: A4; margin: 0; }
  html, body{ margin:0 !important; padding:0 !important; }
  .qd-minimal{ background:#fff; padding:0; margin:0; }
  .qd-minimal .sheet{ max-width:100%; margin:0; }
  .qd-minimal .page-frame{ width:100%; }
  .qd-minimal .page-frame > tbody{ display:table-row-group; }
  .qd-minimal .page-frame > tbody > tr > td{ padding:0 15mm; }
  .qd-minimal .page-frame > thead > tr > td,
  .qd-minimal .page-frame > tfoot > tr > td{ height:12mm; padding:0; border:none; }
  .qd-minimal .page-frame > thead{ display:table-header-group; }
  .qd-minimal .page-frame > tfoot{ display:table-footer-group; }
  .qd-minimal table thead{ display:table-header-group; }
  .qd-minimal table tr{ break-inside:avoid; page-break-inside:avoid; }
  .qd-minimal .page-frame > tbody > tr{ break-inside:auto; page-break-inside:auto; }
  .qd-minimal .sign-footer-group{ break-inside:avoid; page-break-inside:avoid; }
}
`;

const SCOPE_TEMPLATES = [
  { label: "Website Development", text: "Responsive Website Design\n5 Website Pages\nContact Form Integration\nMobile Optimization\nBasic SEO Setup" },
  { label: "App Development", text: "Cross-platform Mobile App (iOS & Android)\nUser Authentication\nAPI Integration\nPush Notifications\nApp Store Submission Support" },
  { label: "Digital Marketing", text: "Social Media Strategy & Management\nPaid Ad Campaigns (Google/Meta)\nMonthly Performance Reports\nContent Calendar Planning\nAudience Targeting & Optimization" },
  { label: "UI/UX Design", text: "User Research & Persona Mapping\nWireframes & Prototypes\nHigh-fidelity UI Design\nDesign System / Style Guide\nUsability Testing" },
  { label: "Branding & Identity", text: "Logo Design\nBrand Color Palette & Typography\nBrand Guidelines Document\nBusiness Card & Letterhead Design\nSocial Media Kit" },
];

const TERMS_TEMPLATES = [
  { label: "Standard", text: "50% advance payment required to begin work, balance due on delivery.\nDelivery timelines are estimates and may shift with scope changes.\nRevisions beyond the agreed scope will be billed separately.\nThis quotation is valid for 15 days from the date of issue." },
  { label: "Project-based", text: "This quotation is valid for 30 days from the date of issue.\nAny additional work outside the agreed scope will be charged separately.\n50% advance payment is required before project commencement.\nFinal deliverables handed over after full payment is received." },
  { label: "Retainer / Service", text: "This agreement covers services rendered on a monthly retainer basis.\nInvoices are due within 15 days of receipt.\nEither party may terminate this agreement with 30 days' written notice.\nUnused hours do not roll over to the following month." },
  { label: "Simple Freelance", text: "Scope: Work will proceed strictly as described in this quotation. Anything outside this scope will be quoted separately.\n\nPayment: 50% upfront, 50% on completion. Late payments beyond 7 days of the due date may incur a 2% monthly late fee.\n\nRevisions: Up to 2 rounds of revisions are included. Additional revisions are billed at the standard hourly rate.\n\nOwnership: Full ownership of final files transfers to the Client upon receipt of full payment.\n\nCancellation: If the Client cancels after work has begun, the advance payment is non-refundable and covers work completed to date.\n\nValidity: This quotation is valid for 15 days from the date of issue." },
];

// Converts an ISO date string ("2026-09-10") into "10 September 2026" for display.
// Falls back to the raw value if it isn't a valid date string.
function formatDateLong(value) {
  if (!value) return "";
  const parts = value.split("-");
  if (parts.length !== 3) return value;
  const [y, m, d] = parts;
  const months = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  const monthName = months[parseInt(m, 10) - 1];
  if (!monthName) return value;
  return `${parseInt(d, 10)} ${monthName} ${y}`;
}

export default function MinimalLayout({ quotation, companyInfo, customers = [], editMode = false, onChange = () => { }, onCustomSectionChange = () => { }, onAddCustomSection = () => { }, onRemoveCustomSection = () => { },
  onLogoUpload = () => { }, onRemoveLogo = () => { },
  onSignatureUpload = () => { }, onRemoveSignature = () => { },
  onApplyCost = () => { }, defaultGstPercent = 18,
}) {
  const v = getQuotationView(quotation, companyInfo);
  const costLines = getCostLines(quotation, defaultGstPercent); const accent = quotation.accentColor || "#111111";
  const [showAddItem, setShowAddItem] = useState(false);

  const handleCustomerSelect = (cust) => {
    onChange("customerId", cust.id);
    onChange("company", cust.company || "");
    onChange("name", cust.name || "");
    onChange("phone", cust.phone || "");
    onChange("email", cust.email || "");
    onChange("clientAddress", cust.address || "");
  };

  const handleCustomerManualChange = (typedName) => {
    onChange("customerId", null);
    onChange("company", typedName);
  };

  return (
    <div className="qd-minimal">
      <style>{styles}</style>
      <div className="sheet">
             <table className="page-frame">
          <thead><tr><td /></tr></thead>
          <tbody>
            <tr>
              <td>
                              <div className="header">
                  <div className="brand">
                    <LogoEdit
                      editMode={editMode} logo={quotation.logo} onUpload={onLogoUpload} onRemove={onRemoveLogo}
                      inputId="minimal-logo" boxStyle={{ height: 80, width: 80 }}
shape={quotation.logoShape} onShapeChange={(s) => onChange("logoShape", s)} fallback={null}
                    />
                    <div>
                      {editMode ? (
                        <CompanySelect editMode value={quotation.issuerName} onChange={(val) => onChange("issuerName", val)} placeholder="Your Company Name" style={{ fontWeight: 500 }} />
                      ) : (
                        <div className="brand-name">{v.issuerName}</div>
                      )}
                      {(editMode || v.issuerAddress) && (
                        <small><EditText editMode={editMode} value={quotation.issuerAddress} onChange={(val) => onChange("issuerAddress", val)} placeholder="Company address" /></small>
                      )}
                    </div>
                  </div>
                </div>
                <div className="titleblock">
                  <h1>Quotation</h1>
                  <div className="subline">
                    <EditText editMode={editMode} value={quotation.projectTitle} onChange={(val) => onChange("projectTitle", val)} placeholder="Project / Quotation Title" />
                  </div>
                                  <div className="doc-meta">
                    <strong>
                      {quotation.quotationNumber
                        ? quotation.quotationNumber
                        : <span style={{ opacity: 0.6, fontStyle: "italic" }}>Draft — number assigned on send</span>}
                    </strong>
                    <span>•</span>
                    <EditText
                      editMode={editMode}
                      type="date"
                      value={quotation.date}
                      onChange={(val) => onChange("date", val)}
                      viewRender={(val) => <span>{formatDateLong(val)}</span>}
                    />
                  </div>
                </div>


                <div className="info-grid">
                  <div className="info-col">
                    <strong>To</strong>
                    {editMode ? (
                      <>
                        <CustomerSelect editMode as="div" style={{ fontWeight: 500, marginBottom: 4 }} customers={customers} value={quotation.company} onSelect={handleCustomerSelect} onManualChange={handleCustomerManualChange} placeholder="Select or search customer" />
                        <EditText editMode as="div" style={{ marginBottom: 4 }} value={quotation.name} onChange={(val) => onChange("name", val)} placeholder="Contact name" />
                        <EditText editMode as="div" style={{ marginBottom: 4 }} value={quotation.clientAddress} onChange={(val) => onChange("clientAddress", val)} placeholder="Client address" />
                        <EditText editMode as="div" style={{ marginBottom: 4 }} value={quotation.phone} onChange={(val) => onChange("phone", val)} placeholder="Phone" />
                        <EditText editMode as="div" value={quotation.email} onChange={(val) => onChange("email", val)} placeholder="Email" />
                      </>
                  ) : (
  <>
    {v.clientCompany && <div className="who-name">Company: {v.clientCompany}</div>}
    <div>Name: {v.clientName}</div>
    {v.clientAddress && <div>Address: {v.clientAddress}</div>}
    {v.clientPhone && <div>Mob: {v.clientPhone}</div>}
    {v.clientEmail && <div>Email: {v.clientEmail}</div>}
  </>
)}
                  </div>
                  <div className="info-col">
                    <strong>From</strong>
                    {editMode ? (
                      <>
                        <CompanySelect editMode as="div" style={{ fontWeight: 500, marginBottom: 4 }} value={quotation.issuerName} onChange={(val) => onChange("issuerName", val)} placeholder="Your Company Name" />
                        <EditText editMode as="div" style={{ marginBottom: 4 }} value={quotation.issuerAddress} onChange={(val) => onChange("issuerAddress", val)} placeholder="Company address" />
                        <EditText editMode as="div" style={{ marginBottom: 4 }} value={quotation.issuerPhone} onChange={(val) => onChange("issuerPhone", val)} placeholder="Phone" />
                        <EditText editMode as="div" value={quotation.issuerEmail} onChange={(val) => onChange("issuerEmail", val)} placeholder="Email" />
                      </>
                    ) : (
                      <>
                        <div className="who-name">{v.issuerName}</div>
                        {v.issuerAddress && <div>{v.issuerAddress}</div>}
                        {v.issuerPhone && <div>{v.issuerPhone}</div>}
                        {v.issuerEmail && <div>{v.issuerEmail}</div>}
                      </>
                    )}
                  </div>
                                 </div>

                <div className="block">
                  <h4>Project Description</h4>
              <EditArea editMode={editMode} rows={4} value={htmlToPlainText(quotation.description) || `This proposal outlines the scope of work agreed upon between ${v.issuerName || "your company"} and ${v.clientCompany || "the client"}.`} onChange={(val) => onChange("description", val)}
  placeholder="Describe the project..." viewRender={(val) => <div className="section-body"><RichOrPlainView value={val} as="paragraph" /></div>} />
                </div>

                {(editMode || (quotation.scopeOfWork && quotation.scopeOfWork.trim())) && (
                  <div className="block">
                    <h4>Scope of Work</h4>
                    {editMode ? (
                      <>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                          {SCOPE_TEMPLATES.map((tpl) => (
                            <button
                              key={tpl.label} type="button" onClick={() => onChange("scopeOfWork", tpl.text)}
                              title={`Use "${tpl.label}" scope template`}
                              style={{
                                border: quotation.scopeOfWork === tpl.text ? `1.5px solid ${accent}` : "1px solid var(--line)",
                                borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 500, cursor: "pointer",
                                backgroundColor: quotation.scopeOfWork === tpl.text ? "#f2f2f2" : "#fff",
                                color: quotation.scopeOfWork === tpl.text ? accent : "var(--muted)",
                              }}
                            >
                              {tpl.label}
                            </button>
                          ))}
                          <button
                            type="button" onClick={() => onChange("scopeOfWork", "")}
                            title="Write your own custom scope"
                            style={{
                              border: `1.5px dashed ${accent}`, borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 500, cursor: "pointer",
                              backgroundColor: "transparent", color: accent,
                            }}
                          >
                            + Custom
                          </button>
                        </div>
                        <EditArea editMode rows={4} value={htmlToPlainText(quotation.scopeOfWork)} onChange={(val) => onChange("scopeOfWork", val)} placeholder="One item per line, or pick a template above..." />
                      </>
                    ) : (
                      <div className="section-body"><RichOrPlainView value={quotation.scopeOfWork} /></div>
                    )}
                  </div>
                )}

                {(editMode || (quotation.deliverables && quotation.deliverables.trim())) && (
                  <div className="block">
                    <h4>Deliverables</h4>
                    {editMode ? (
                      <EditArea editMode rows={4} value={htmlToPlainText(quotation.deliverables)} onChange={(val) => onChange("deliverables", val)} placeholder="One item per line..." />
                    ) : (
                      <div className="section-body"><RichOrPlainView value={quotation.deliverables} /></div>
                    )}
                  </div>
                )}

                {(editMode || (quotation.technologyUsed && quotation.technologyUsed.trim())) && (
                  <div className="block">
                    <h4>Technology Used</h4>
                    {editMode ? (
                      <EditArea editMode rows={3} value={htmlToPlainText(quotation.technologyUsed)} onChange={(val) => onChange("technologyUsed", val)} placeholder="One item per line..." />
                    ) : (
                      <div className="section-body"><RichOrPlainView value={quotation.technologyUsed} /></div>
                    )}
                  </div>
                )}

            {!editMode && v.customSections.map((s, i) => (
  <div className="block" key={i}>
    <h4>{s.title}</h4>
    <div className="section-body">
      {s.type === "table" ? (
        <table className="cost-summary">
          <thead>
            <tr>{(s.columns || []).map((col, ci) => <th key={ci}>{col}</th>)}</tr>
          </thead>
          <tbody>
            {(s.rows || []).map((row, ri) => (
              <tr key={ri}>{row.map((cell, ci) => <td key={ci}>{cell}</td>)}</tr>
            ))}
          </tbody>
        </table>
          ) : Array.isArray(s.lines) ? (
        <ul>{s.lines.map((l, j) => <li key={j}>{l}</li>)}</ul>
      ) : (
        <RichOrPlainView value={s.content} as="paragraph" />
      )}
    </div>
  </div>
))}
                {editMode && (
                  <div className="block">
                    <h4>Custom Sections</h4>
                    <CustomSectionsEdit sections={quotation.customSections || []} accent={accent} onChange={onCustomSectionChange} onAdd={onAddCustomSection} onRemove={onRemoveCustomSection} />
                  </div>
                )}

                {(editMode || costLines.lines.length > 0) && (
                  <div className="block">
                    <h4>Project Cost</h4>
                    {editMode ? (
                      <CostItemsTable
                        items={getCostItems(quotation)}
                        onChange={(items) => onChange("costItems", items)}
gstMode={quotation.gstMode || (quotation.includeGst === true ? "with" : "without")}                        gstPercent={quotation.gstPercent}
                        defaultGstPercent={defaultGstPercent}
                        onGstChange={onChange}
                        accent={accent}
                      />
                    ) : (
                      <table className="cost-summary">
                        <thead><tr><th>Description</th><th className="num">Line Total</th></tr></thead>
                        <tbody>
                          {costLines.lines.map((line, i) => {
                            const [label, value] = splitCostLine(line);
                            return <tr key={i}><td>{label}</td><td className="num">{value}</td></tr>;
                          })}
                        </tbody>
                        {costLines.grandLine && (() => {
                          const [label, value] = splitCostLine(costLines.grandLine);
                          return <tfoot><tr><td>{label}</td><td className="num">{value}</td></tr></tfoot>;
                        })()}
                      </table>
                    )}
                  </div>
                )}

                {(editMode || (quotation.timelineDesc && quotation.timelineDesc.trim())) && (
                  <div className="block">
                    <h4>Project Timeline</h4>
                    {editMode ? (
                      <EditArea editMode rows={4} value={htmlToPlainText(quotation.timelineDesc)} onChange={(val) => onChange("timelineDesc", val)} placeholder="One item per line..." />
                    ) : (
                      <div className="section-body"><RichOrPlainView value={quotation.timelineDesc} /></div>
                    )}
                  </div>
                )}

               {(editMode || (quotation.paymentTerms && quotation.paymentTerms.trim())) && (
  <div className="block">
    <h4>Payment Terms</h4>
    {editMode ? (
      <EditArea editMode rows={3} value={htmlToPlainText(quotation.paymentTerms)} onChange={(val) => onChange("paymentTerms", val)} placeholder="Payment terms..." />
    ) : (
      <div className="section-body"><RichOrPlainView value={quotation.paymentTerms} /></div>
    )}
  </div>
)}

{(editMode || (quotation.terms && quotation.terms.trim())) && (
  <div className="block">
    <h4>Terms &amp; Conditions</h4>
    {editMode ? (
      <>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          {TERMS_TEMPLATES.map((tpl) => (
            <button
              key={tpl.label} type="button" onClick={() => onChange("terms", tpl.text)}
              title={`Use "${tpl.label}" terms template`}
              style={{
                border: quotation.terms === tpl.text ? `1.5px solid ${accent}` : "1px solid var(--line)",
                borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 500, cursor: "pointer",
                backgroundColor: quotation.terms === tpl.text ? "#f2f2f2" : "#fff",
                color: quotation.terms === tpl.text ? accent : "var(--muted)",
              }}
            >
              {tpl.label}
            </button>
          ))}
          <button
            type="button" onClick={() => onChange("terms", "")}
            title="Write your own custom terms"
            style={{
              border: `1.5px dashed ${accent}`, borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 500, cursor: "pointer",
              backgroundColor: "transparent", color: accent,
            }}
          >
            + Custom
          </button>
        </div>
              <EditArea editMode rows={6} value={htmlToPlainText(quotation.terms)} onChange={(val) => onChange("terms", val)} placeholder="One term per line, or pick a template above..." />
      </>
    ) : (
      <div className="section-body">
        <ul className="terms-list">
          {htmlToPlainText(quotation.terms).split("\n").map((line) => line.trim()).filter(Boolean).map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </div>
    )}
  </div>
)}

                {(editMode || quotation.notes?.trim()) && (
                  <div className="block">
                    <h4>Note</h4>
                  <EditArea editMode={editMode} rows={2} value={htmlToPlainText(quotation.notes)} onChange={(val) => onChange("notes", val)}
  placeholder="Additional notes..." viewRender={(val) => <div className="section-body"><RichOrPlainView value={val} as="paragraph" /></div>} />
                  </div>
                )}

                <div className="sign-footer-group">
                <div className="sign">
                  <div>
                    <div className="sig-box"></div>
                    <div className="sign-line"></div>
                    <div className="who">{quotation.name}</div>
                    <div className="label">Client Signature</div>
                  </div>
                  <div>
                    <div className="sig-box">
                      <SignatureEdit editMode={editMode} signature={quotation.signature} onUpload={onSignatureUpload} onRemove={onRemoveSignature}
                        inputId="minimal-sig" boxStyle={{ maxHeight: 55, width: editMode ? 150 : "auto", height: editMode ? 55 : "auto" }} />
                    </div>
                    <div className="sign-line"></div>
                    <div className="who">{quotation.issuerName}</div>
                    <div className="label">Authorized Signature</div>
                  </div>
                </div>

                <div className="footer-bar">
                  {editMode ? (
                    <EditText editMode value={quotation.issuerEmail} onChange={(val) => onChange("issuerEmail", val)} placeholder="Email" />
                  ) : (
                    v.issuerEmail && <span>Email: {v.issuerEmail}</span>
                  )}
                  {editMode ? (
                    <EditText editMode value={quotation.issuerPhone} onChange={(val) => onChange("issuerPhone", val)} placeholder="Phone" />
                  ) : (
                    v.issuerPhone && (
                      <span>
                        Phone: {v.issuerPhone.trim().startsWith("+") ? v.issuerPhone : `+91 ${v.issuerPhone}`}
                      </span>
                                      )
                  )}
                </div>
                </div>
              </td>
            </tr>
          </tbody>
          <tfoot><tr><td /></tr></tfoot>
        </table>
      </div>
    </div>
  );
}