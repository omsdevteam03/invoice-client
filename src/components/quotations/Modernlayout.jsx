import { getQuotationView, getCostLines, getCostItems, splitCostLine, htmlToPlainText } from "./quotationLayoutUtils";
import { useState } from "react";
import { EditText, EditArea, LogoEdit, SignatureEdit, CostItemsTable, CustomSectionsEdit, CompanySelect, CustomerSelect, RichOrPlainView } from "./EditableField";


const styles = `
.qd-modern{
  --teal:#5a8a7f; --tealDark:#4a7469; --paper:#ffffff; --line:#e2e8e5; --ink:#2d3b38; --muted:#8a9a96; --bg:#ffffff;
  background:var(--bg); font-family:'Inter','Segoe UI',Arial,sans-serif; color:var(--ink); padding:40px 20px;
}
.qd-modern .sheet{ max-width:800px; margin:0 auto; background:var(--paper); border-radius:16px; overflow:hidden; box-shadow:0 6px 30px rgba(45,59,56,0.10); }
.qd-modern .page-frame{ width:100%; border-collapse:collapse; }
.qd-modern .page-frame > thead > tr > td,
.qd-modern .page-frame > tbody > tr > td{ padding:0; }

.qd-modern .header{
  background:var(--teal); color:#fff; padding:14px 24px;
  display:flex; justify-content:space-between; align-items:center; gap:16px;
  border-radius:0 0 18px 0;
}
.qd-modern .brand{ display:flex; align-items:center; margin-left:30px; background:var(--teal); padding:8px; border-radius:10px; }
.qd-modern .brand img{ height:68px; border-radius:6px; display:block; }

.qd-modern .header-info{flex:1; text-align:center; }
.qd-modern .header-info .company-name{ font-size:22px; font-weight:700; color:#fff; margin:0; }
.qd-modern .header-info .company-address{ font-size:13px; color:rgba(255,255,255,0.85); margin:4px 0 0; line-height:1.5; }
.qd-modern .body{ padding:0 44px 40px; }
.qd-modern .subline{ font-size:14px; font-weight:700; margin:0 0 24px; color:var(--tealDark); display:block; text-align:center; padding:10px 0; }
.qd-modern .info-table{ background:var(--bg); border:1px solid var(--line); border-radius:12px; margin-bottom:32px; break-inside:avoid; overflow:hidden; }
.qd-modern .info-row{ display:flex; }
.qd-modern .info-row + .info-row{ border-top:1px solid var(--line); }
.qd-modern .info-cell{ flex:1; padding:16px 20px; font-size:13px; }
.qd-modern .info-cell + .info-cell{ border-left:1px solid var(--line); }
.qd-modern .info-cell strong{ display:block; font-size:10.5px; text-transform:uppercase; letter-spacing:1.2px; color:var(--tealDark); margin-bottom:8px; font-weight:700; }
.qd-modern .info-lines div{ font-size:14px; line-height:1.7; color:var(--ink); }
.qd-modern .info-lines .who-name{ font-weight:700; }

.qd-modern table.cost-table{ width:100%; border-collapse:collapse; margin-top:8px; border-radius:10px; overflow:hidden; }
.qd-modern th{ text-align:left; font-size:11.5px; text-transform:none; color:#fff; background:var(--teal); padding:12px 14px; font-weight:600; }
.qd-modern th.num, .qd-modern td.num{ text-align:right; }
.qd-modern td{ padding:14px; border-bottom:1px solid var(--line); font-size:13.5px; }
.qd-modern tr:nth-child(even) td{ background:var(--bg); }
.qd-modern tr.grand-row td{ font-weight:700; font-size:13.5px; color:var(--ink); border-top:2px solid var(--tealDark); border-bottom:none; background:transparent; }
.qd-modern .totals{ width:280px; margin-left:auto; margin-top:16px; }
.qd-modern .totals .row{ display:flex; justify-content:space-between; padding:6px 4px; font-size:13.5px; color:var(--ink); }
.qd-modern .totals .grand{ display:flex; justify-content:space-between; padding:10px 14px; margin-top:6px; background:var(--teal); color:#fff; border-radius:8px; font-size:14px; font-weight:700; }

.qd-modern .terms{ margin-top:36px; padding-top:22px; border-top:1px solid var(--line); }
.qd-modern .terms h4{ font-size:13px; font-weight:700; color:var(--ink); margin:0 0 10px; break-after:avoid; page-break-after:avoid; }

.qd-modern .terms ul{ margin:0; padding-left:18px; font-size:12.5px; line-height:1.9; color:var(--ink); }

.qd-modern .block{ margin-top:20px; }
.qd-modern .block h4{ font-size:13px; font-weight:700; color:var(--tealDark); margin:0 0 10px; break-after:avoid; page-break-after:avoid; }

.qd-modern .block li{ break-inside:avoid; }
.qd-modern .cols2{ display:block; }
.qd-modern .cols2 .block{ margin-top:20px; }
.qd-modern .cols2 .block:first-child{ margin-top:0; }
.qd-modern .cols2 .block h4{ margin-top:0; color:var(--tealDark); }

.qd-modern .sign{ display:flex; gap:60px; margin-top:48px; flex-wrap:wrap; break-inside:avoid; }
.qd-modern .sign > div{ flex:1; min-width:200px; }
.qd-modern .sig-box{ min-height:48px; display:flex; align-items:flex-end; }
.qd-modern .sig-box img{ max-height:40px; }
.qd-modern .sign-line{ border-top:1px solid var(--line); margin-top:4px; }
.qd-modern .sign .who{ color:var(--ink); font-weight:700; margin-top:8px; font-size:13px; }
.qd-modern .sign .label{ color:var(--muted); font-size:12px; margin-top:2px; }

.qd-modern .footer-bar{ margin-top:20px; padding-top:16px; display:flex; justify-content:flex-end; flex-wrap:wrap; gap:16px; font-size:12px; color:var(--muted); }
.qd-modern .footer-strip{ height:26px; background:var(--teal); border-radius:0 40px 0 0; margin-top:24px; }

@media print {
@page{ size: A4; margin-top:14mm; margin-bottom:14mm; margin-left:0; margin-right:0; }  .qd-modern{ background:#fff; padding:0; }
  .qd-modern .sheet{ box-shadow:none; border-radius:0; max-width:100%; margin:0; }
  .qd-modern .header{ border-radius:0; }
  .qd-modern .footer-strip{ border-radius:0; height:14px; margin-top:14px; }
  .qd-modern .sign{ margin-top:24px; page-break-inside: avoid; }
  .qd-modern .footer-bar{ margin-top:10px; padding-top:8px; }
  .qd-modern .body{ padding-bottom:12px; }
  .qd-modern .page-frame > tbody{ display:table-row-group; }
  .qd-modern .info-table{ page-break-inside: avoid; }
  .qd-modern table:not(.page-frame) thead{ display:table-header-group; }
  .qd-modern table:not(.page-frame) tr{ page-break-inside: avoid; break-inside: avoid; }
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

export default function ModernLayout({ quotation, companyInfo, customers = [], editMode = false, onChange = () => { }, onCustomSectionChange = () => { }, onAddCustomSection = () => { }, onRemoveCustomSection = () => { },
  onLogoUpload = () => { }, onRemoveLogo = () => { },
  onSignatureUpload = () => { }, onRemoveSignature = () => { },
  onApplyCost = () => { }, defaultGstPercent = 18,
}) {
  const v = getQuotationView(quotation, companyInfo);
  const costLines = getCostLines(quotation, defaultGstPercent);
  const accent = quotation.accentColor || "#5a8a7f";
  const [showAddItem, setShowAddItem] = useState(false); const nameParts = (v.issuerName || "").split(" ");

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
    <div className="qd-modern">
      <style>{styles}</style>
      <div className="sheet">
        <table className="page-frame">
          <tbody>
            <tr>
              <td>
                <div className="header">
                  <div className="brand">
                    <LogoEdit
                      editMode={editMode} logo={quotation.logo} onUpload={onLogoUpload} onRemove={onRemoveLogo}
                      inputId="modern-logo" boxStyle={{ height: 68, width: 92 }} fallback={null}
                    />
                  </div>
                  <div className="header-info">
                    {editMode ? (
                      <>
                        <CompanySelect editMode value={quotation.issuerName} onChange={(val) => onChange("issuerName", val)} placeholder="Your Company Name" style={{ color: "#fff", fontWeight: 700, textAlign: "center", justifyContent: "center", background: "rgba(255,255,255,0.15)", border: "1px dashed rgba(255,255,255,0.5)" }} />      <EditText editMode value={quotation.issuerAddress} onChange={(val) => onChange("issuerAddress", val)} placeholder="Company address" style={{ color: "#fff", textAlign: "center", background: "rgba(255,255,255,0.15)", border: "1px dashed rgba(255,255,255,0.5)", marginTop: 6 }} />
                      </>
                    ) : (
                      <>
                        <p className="company-name">{v.issuerName}</p>
                        {v.issuerAddress && <p className="company-address">{v.issuerAddress}</p>}
                      </>
                    )}
                  </div>                </div>
              </td>
            </tr>
            <tr>
              <td>
                <div className="body">
                  <div className="subline">
                    <EditText editMode={editMode} value={quotation.projectTitle} onChange={(val) => onChange("projectTitle", val)} placeholder="Project / Quotation Title" style={{ textAlign: "center" }} />
                  </div>

                  <div className="info-table">
                    <div className="info-row">
                      <div className="info-cell">
                        <strong>Quotation Num</strong>
                        <EditText editMode={editMode} value={quotation.id} onChange={(val) => onChange("id", val)} placeholder="Quotation No." />
                      </div>
                      <div className="info-cell">
                        <strong>Date</strong>
                        <EditText editMode={editMode} type="date" value={quotation.date} onChange={(val) => onChange("date", val)} />
                      </div>
                    </div>
                    <div className="info-row">
                      <div className="info-cell">
                        <strong>To</strong>
                        <div className="info-lines">
                          {editMode ? (
                            <>
                              <CustomerSelect editMode as="div" style={{ fontWeight: 700, marginBottom: 4 }} customers={customers} value={quotation.company} onSelect={handleCustomerSelect} onManualChange={handleCustomerManualChange} placeholder="Select or search customer" />
                              <EditText editMode as="div" style={{ marginBottom: 4 }} value={quotation.name} onChange={(val) => onChange("name", val)} placeholder="Contact name" />
                              <EditText editMode as="div" style={{ marginBottom: 4 }} value={quotation.phone} onChange={(val) => onChange("phone", val)} placeholder="Phone" />
                              <EditText editMode as="div" value={quotation.email} onChange={(val) => onChange("email", val)} placeholder="Email" />
                            </>
                          ) : (
                            <>
                              {v.clientCompany && <div className="who-name">Company: {v.clientCompany}</div>}
                              <div>Name: {v.clientName}</div>
                              {v.clientPhone && <div>Mob: {v.clientPhone}</div>}
                              {v.clientEmail && <div>Email: {v.clientEmail}</div>}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="info-cell">
                        <strong>From</strong>
                        <div className="info-lines">
                          {editMode ? (
                            <>
                              <CompanySelect editMode as="div" style={{ fontWeight: 700, marginBottom: 4 }} value={quotation.issuerName} onChange={(val) => onChange("issuerName", val)} placeholder="Your Company Name" />
                              <EditText editMode as="div" style={{ marginBottom: 4 }} value={quotation.issuerAddress} onChange={(val) => onChange("issuerAddress", val)} placeholder="Company address" />
                              <EditText editMode as="div" style={{ marginBottom: 4 }} value={quotation.issuerPhone} onChange={(val) => onChange("issuerPhone", val)} placeholder="Phone" />
                              <EditText editMode as="div" value={quotation.issuerEmail} onChange={(val) => onChange("issuerEmail", val)} placeholder="Email" />
                            </>
                          ) : (
                            <>
                              <div className="who-name">Company: {v.issuerName}</div>
                              {v.issuerAddress && <div>Address: {v.issuerAddress}</div>}
                              {v.issuerPhone && <div>Mob: {v.issuerPhone}</div>}
                              {v.issuerEmail && <div>Email: {v.issuerEmail}</div>}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="block">
                    <h4>Project Description</h4>
                  <EditArea editMode={editMode} rows={4} value={htmlToPlainText(quotation.description) || `This proposal outlines the scope of work agreed upon between ${v.issuerName || "your company"} and ${v.clientCompany || "the client"}.`} onChange={(val) => onChange("description", val)}
placeholder="Describe the project..." viewRender={(val) => <RichOrPlainView value={val} as="paragraph" />} />                  </div>

                  {(editMode || (quotation.scopeOfWork && quotation.scopeOfWork.trim()) || (quotation.deliverables && quotation.deliverables.trim())) && (
                    <div className="cols2">
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
                                      borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                                      backgroundColor: quotation.scopeOfWork === tpl.text ? `${accent}22` : "#fff",
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
                                    border: `1.5px dashed ${accent}`, borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                                    backgroundColor: "transparent", color: accent,
                                  }}
                                >
                                  + Custom
                                </button>
                              </div>
                              <EditArea editMode rows={4} value={htmlToPlainText(quotation.scopeOfWork)} onChange={(val) => onChange("scopeOfWork", val)} placeholder="One item per line, or pick a template above..." />
                            </>
                          ) : (
                            <RichOrPlainView value={quotation.scopeOfWork} />
                          )}
                        </div>
                      )}
                      {(editMode || (quotation.deliverables && quotation.deliverables.trim())) && (
                        <div className="block">
                          <h4>Deliverables</h4>
                          {editMode ? (
                            <EditArea editMode rows={4} value={htmlToPlainText(quotation.deliverables)} onChange={(val) => onChange("deliverables", val)} placeholder="One item per line..." />
                          ) : (
                            <RichOrPlainView value={quotation.deliverables} />
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {(editMode || (quotation.technologyUsed && quotation.technologyUsed.trim())) && (
                    <div className="block">
                      <h4>Technology Used</h4>
                      {editMode ? (
                        <EditArea editMode rows={3} value={htmlToPlainText(quotation.technologyUsed)} onChange={(val) => onChange("technologyUsed", val)} placeholder="One item per line..." />
                      ) : (
                        <RichOrPlainView value={quotation.technologyUsed} />
                      )}
                    </div>
                  )}

               {!editMode && v.customSections.map((s, i) => (
  <div className="block" key={i}>
    <h4>{s.title}</h4>
    {s.type === "table" ? (
      <table className="cost-summary">
        <thead><tr>{(s.columns || []).map((col, ci) => <th key={ci}>{col}</th>)}</tr></thead>
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
gstMode={quotation.gstMode || (quotation.includeGst === true ? "with" : "without")}                          gstPercent={quotation.gstPercent}
                          defaultGstPercent={defaultGstPercent}
                          onGstChange={onChange}
                          accent={accent}
                        />
                      ) : (
                        <table className="cost-table">
                          <thead>
                            <tr>
                              <th>Description</th>
                              <th className="num">Line Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {costLines.lines.map((line, i) => {
                              const [label, value] = splitCostLine(line);
                              return (
                                <tr key={i}>
                                  <td>{label}</td>
                                  <td className="num">{value}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                          {costLines.grandLine && (() => {
                            const [label, value] = splitCostLine(costLines.grandLine);
                            return (
                              <tfoot>
                                <tr className="grand-row">
                                  <td>{label}</td>
                                  <td className="num">{value}</td>
                                </tr>
                              </tfoot>
                            );
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
                        <RichOrPlainView value={quotation.timelineDesc} />
                      )}
                    </div>
                  )}

                 {(editMode || (quotation.paymentTerms && quotation.paymentTerms.trim())) && (
  <div className="block">
    <h4>Payment Terms</h4>
    {editMode ? (
      <EditArea editMode rows={3} value={htmlToPlainText(quotation.paymentTerms)} onChange={(val) => onChange("paymentTerms", val)} placeholder="Payment terms..." />
    ) : (
      <RichOrPlainView value={quotation.paymentTerms} />
    )}
  </div>
)}

{(editMode || (quotation.terms && quotation.terms.trim())) && (
  <div className="terms">
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
                borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                backgroundColor: quotation.terms === tpl.text ? `${accent}22` : "#fff",
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
              border: `1.5px dashed ${accent}`, borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
              backgroundColor: "transparent", color: accent,
            }}
          >
            + Custom
          </button>
        </div>
           <EditArea editMode rows={6} value={htmlToPlainText(quotation.terms)} onChange={(val) => onChange("terms", val)} placeholder="One term per line, or pick a template above..." />
      </>
    ) : (
      <ul className="terms-list">
        {htmlToPlainText(quotation.terms).split("\n").map((line) => line.trim()).filter(Boolean).map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    )}
  </div>
)}
                  {(editMode || quotation.notes?.trim()) && (
                    <div className="block">
                      <h4>Note</h4>
                      <EditArea editMode={editMode} rows={2} value={htmlToPlainText(quotation.notes)} onChange={(val) => onChange("notes", val)}
  placeholder="Additional notes..." viewRender={(val) => <RichOrPlainView value={val} as="paragraph" />} />

                    </div>
                  )}

                  <div className="sign">
                    <div>
                      <div className="sig-box"></div>
                      <div className="sign-line"></div>
                      <div className="who">{quotation.company || quotation.name || "Client"}</div>
                      {quotation.company && quotation.name && (
                        <div className="label" style={{ marginTop: 2 }}>{quotation.name}</div>
                      )}
                      <div className="label">Client Signature</div>
                    </div>
                    <div>
                      <div className="sig-box">
                        <SignatureEdit editMode={editMode} signature={quotation.signature} onUpload={onSignatureUpload} onRemove={onRemoveSignature}
                          inputId="modern-sig" boxStyle={{ maxHeight: 40, width: editMode ? 150 : "auto", height: editMode ? 40 : "auto" }} />
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
        </table>
        <div className="footer-strip"></div>
      </div>
    </div>
  );
}