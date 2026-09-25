import { useState } from "react";
import DOMPurify from "dompurify";
import { getQuotationView, getCostLines, getCostItems, splitCostLine, htmlToPlainText } from "./quotationLayoutUtils";
import { EditText, EditArea, LogoEdit, SignatureEdit, CostItemsTable, CustomSectionsEdit, CompanySelect, CustomerSelect, RichOrPlainView } from "./EditableField";
const TERMS_TEMPLATES = [
  {
    label: "Standard",
    text: "This quotation is valid for 30 days from the date of issue\nAny additional work outside the agreed scope will be charged separately\n50% advance payment is required before project commencement\nFinal deliverables handed over after full payment is received",
  },
  {
    label: "Project-based",
    text: "This quotation is valid for 15 days from the date of issue\nScope is fixed as per the deliverables listed above\n50% advance, 50% on delivery\nRevisions beyond 2 rounds will be charged extra",
  },
  {
    label: "Retainer / Service",
    text: "This agreement renews monthly unless cancelled with 15 days' notice\nMonthly fee is billed in advance\nUnused hours do not carry over to the next month\nAdditional hours beyond the retainer are billed separately",
  },
  {
    label: "Milestone-based",
    text: "Payment is released in stages upon completion of each milestone\nEach milestone must be approved by the client before the next begins\nDelays in client feedback may extend the overall timeline\nFinal milestone payment is due before handover",
  },
  {
    label: "Hourly / Time & Material",
    text: "Work is billed on an hourly basis as per the agreed rate\nA weekly/monthly timesheet will be shared with the client\nInvoices are due within 7 days of receipt\nEstimated hours are indicative and may vary with scope changes",
  },
];

const SCOPE_TEMPLATES = [
  { label: "Website Development", text: "Responsive Website Design\n5 Website Pages\nContact Form Integration\nMobile Optimization\nBasic SEO Setup" },
  { label: "App Development", text: "Cross-platform Mobile App (iOS & Android)\nUser Authentication\nAPI Integration\nPush Notifications\nApp Store Submission Support" },
  { label: "Digital Marketing", text: "Social Media Strategy & Management\nPaid Ad Campaigns (Google/Meta)\nMonthly Performance Reports\nContent Calendar Planning\nAudience Targeting & Optimization" },
  { label: "UI/UX Design", text: "User Research & Persona Mapping\nWireframes & Prototypes\nHigh-fidelity UI Design\nDesign System / Style Guide\nUsability Testing" },
  { label: "Branding & Identity", text: "Logo Design\nBrand Color Palette & Typography\nBrand Guidelines Document\nBusiness Card & Letterhead Design\nSocial Media Kit" },
];

const styles = `
.qd-bold{
  --ink:#111111; --red:#d7263d; --muted:#5a5a5a; --line:#111111; --paper:#ffffff;
  background:#e8e8e8; font-family:'Helvetica Neue',Arial,sans-serif; color:var(--ink); padding:40px 20px;
}
.qd-bold .sheet{ max-width:800px; margin:0 auto; background:var(--paper); }
.qd-bold .page-frame{ width:100%; border-collapse:collapse; border:none; }
.qd-bold .page-frame td,
.qd-bold .page-frame tr,
.qd-bold .page-frame thead,
.qd-bold .page-frame tbody{ border:none; }
.qd-bold .page-frame > thead > tr > td,
.qd-bold .page-frame > tbody > tr > td{ padding:0; border:none; }

.qd-bold .masthead{ border-bottom:4px solid var(--ink); padding:32px 48px 24px; display:flex; align-items:center; gap:18px; margin-bottom:32px; }
.qd-bold .masthead img{ height:56px; width:auto; }
.qd-bold .masthead .company-name{ font-size:17px; font-weight:800; letter-spacing:1px; text-transform:uppercase; color:var(--ink); }
.qd-bold .masthead .company-address{ font-size:12px; color:var(--muted); margin-top:5px; line-height:1.5; }

.qd-bold h1{ font-size:36px; font-weight:900; letter-spacing:-1.5px; margin:20px 48px 6px; text-transform:uppercase; line-height:0.95; }
.qd-bold .subline{ margin:0 48px 32px; font-size:15px; font-weight:600; color:var(--ink); border-bottom:1px solid var(--line); padding-bottom:24px; }

.qd-bold .info-table{ margin:0 48px 36px; border:1px solid var(--line); border-top:4px solid var(--red); break-inside:avoid; }
.qd-bold .info-row{ display:flex; }
.qd-bold .info-row + .info-row{ border-top:1px solid var(--line); }
.qd-bold .info-cell{ flex:1; padding:16px 20px; font-size:13px; }
.qd-bold .info-cell + .info-cell{ border-left:1px solid var(--line); }
.qd-bold .info-cell strong{ display:block; font-size:11px; text-transform:uppercase; letter-spacing:1px; color:var(--red); margin-bottom:8px; }
.qd-bold .info-lines div{ font-size:14px; line-height:1.7; }
.qd-bold .info-lines .who-name{ font-weight:700; }

.qd-bold table.cost-summary{ width:calc(100% - 96px); margin:0 48px; border-collapse:collapse; }
.qd-bold .cost-summary thead th{ background:var(--red); color:#fff; text-align:left; font-size:12px; font-weight:700; padding:8px 12px; border:none; }
.qd-bold .cost-summary thead th.num{ text-align:right; }
.qd-bold .cost-summary tbody td{ padding:7px 12px; font-size:13.5px; color:var(--ink); border:none; }
.qd-bold .cost-summary tbody tr:nth-child(even){ background:#efefef; }
.qd-bold .cost-summary tbody td.num{ text-align:right; }
.qd-bold .cost-summary tfoot td{ padding:10px 12px; font-size:14px; font-weight:700; color:var(--ink); border-top:2px solid var(--ink); }
.qd-bold .cost-summary tfoot td.num{ text-align:right; }

.qd-bold .totals{ width:280px; margin:16px 48px 0 auto; }
.qd-bold .totals .row{ display:flex; justify-content:space-between; padding:6px 0; font-size:14px; color:var(--muted); }
.qd-bold .totals .grand{ display:flex; justify-content:space-between; padding:10px 0; margin-top:6px; border-top:1px solid var(--line); font-size:14px; font-weight:600; color:var(--ink); }
.qd-bold .terms{ margin:32px 48px 0; padding-top:20px; }
.qd-bold .terms h4{ font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#d7263d; margin:0 0 12px; break-after:avoid; page-break-after:avoid; }

.qd-bold .terms ul{ margin:0; padding-left:18px; font-size:13px; line-height:2; }
.qd-bold .terms-templates{ display:flex; gap:10px; flex-wrap:wrap; margin:0 0 12px; }
.qd-bold .terms-template-btn{ padding:6px 14px; border-radius:999px; border:1px solid #ccc; background:#fff; font-size:12px; font-weight:600; color:var(--muted); cursor:pointer; }
.qd-bold .terms-template-btn:hover{ border-color:var(--red); color:var(--red); }
.qd-bold .terms-template-btn.active{ border:1px dashed var(--red); color:var(--red); }
.qd-bold .block{ margin:26px 48px 0; }
.qd-bold .block h4{ font-size:11px; text-transform:uppercase; letter-spacing:1px; color:var(--red); margin:0 0 12px; break-after:avoid; page-break-after:avoid; }
.qd-bold .block p{ margin:0; font-size:13px; line-height:1.8; break-inside:avoid; }
.qd-bold .block ul{ margin:0; padding-left:18px; font-size:13px; line-height:2; }
.qd-bold .block li{ break-inside:avoid; word-break:break-word; }

/* rich-text (TinyMCE) rendering */
.qd-bold .quotation-rich-text{ font-size:13px; line-height:1.85; color:var(--ink); }
.qd-bold .quotation-rich-text p{ margin:0 0 8px; }
.qd-bold .quotation-rich-text ul,
.qd-bold .quotation-rich-text ol{ margin:0 0 8px; padding-left:18px; }
.qd-bold .quotation-rich-text li{ margin-bottom:4px; }
.qd-bold .quotation-rich-text strong{ font-weight:700; }

.qd-bold .sign{ display:table; width:calc(100% - 96px); table-layout:fixed; margin:24px 48px 16px; border-spacing:0; }
.qd-bold .sign > div{ display:table-cell; width:50%; vertical-align:bottom; padding-right:24px; }
.qd-bold .sig-box{ min-height:56px; display:flex; align-items:flex-end; }
.qd-bold .sig-box img{ max-height:44px; }
.qd-bold .sign-line{ border-top:1px solid var(--line); margin-top:6px; }
.qd-bold .sign .who{ margin-top:8px; color:var(--ink); font-weight:700; font-size:13px; }

.qd-bold .footer-bar{ margin:0 48px 16px; padding-top:12px; border-top:1px solid var(--line); display:flex; justify-content:flex-end; flex-wrap:wrap; gap:16px; font-size:11px; color:var(--muted); }
@media print {
  @page{ size: A4; margin: 10mm; }
  .qd-bold{ background:#fff; padding:0; }
  .qd-bold .page-frame > tbody{ display:table-row-group; }
  .qd-bold table thead{ display:table-header-group; }
  .qd-bold table tr{ break-inside:avoid; page-break-inside:avoid; }
}

.qd-bold .edit-inline{ font-family:inherit; }
`;

// Renders a value as HTML, whether it's already HTML or plain text with newlines.
// Kept only for Custom Sections below, which still store their own
// `contentHtml` field separately from the shared text fields.
function RichBlock({ html, className }) {
  if (!html) return null;
  return (
    <div
      className={`quotation-rich-text${className ? " " + className : ""}`}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
    />
  );
}

export default function BoldLayout({
  quotation, companyInfo, customers = [], editMode = false, onChange = () => { },
  onCustomSectionChange = () => { }, onAddCustomSection = () => { }, onRemoveCustomSection = () => { },
  onLogoUpload = () => { }, onRemoveLogo = () => { },
  onSignatureUpload = () => { }, onRemoveSignature = () => { },
  onApplyCost = () => { }, defaultGstPercent = 18,
}) {
  const v = getQuotationView(quotation, companyInfo);
  const costLines = getCostLines(quotation, defaultGstPercent);
  const accent = quotation.accentColor || "#d7263d";
  const [activeTermsTemplate, setActiveTermsTemplate] = useState("Custom");
  const [activeScopeTemplate, setActiveScopeTemplate] = useState("Custom");
  const defaultDescription = `This proposal outlines the scope of work agreed upon between ${v.issuerName || "Your Company"} and ${v.clientCompany || "the client"}.`;
  const descriptionValue = quotation.description || defaultDescription;

  // Helper: turn plain "one line per item" text into a real <ul><li> HTML list,
  // same shape as the HTML already used for paymentTerms
  const linesToHtmlList = (text) => {
    const items = (text || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (items.length === 0) return "";
    return `<ul>${items.map((line) => `<li>${line}</li>`).join("")}</ul>`;
  };

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
    <div className="qd-bold">
      <style>{styles}</style>
      <div className="sheet">
        <table className="page-frame">
          <tbody>
            <tr>
              <td>
                <div className="masthead">
                  <LogoEdit
                    editMode={editMode} logo={quotation.logo} onUpload={onLogoUpload} onRemove={onRemoveLogo}
                    inputId="bold-logo" boxStyle={{ height: 56, width: 56 }}
                    fallback={null}
                  />
                  <div>
                    <div className="company-name">
                      <CompanySelect editMode={editMode} value={quotation.issuerName} onChange={(val) => onChange("issuerName", val)} placeholder="Your Company Name" />
                    </div>
                    {(editMode || v.issuerAddress) && (
                      <div className="company-address">
                        <EditText editMode={editMode} value={quotation.issuerAddress} onChange={(val) => onChange("issuerAddress", val)} placeholder="Company address" />
                      </div>
                    )}
                  </div>
                </div>

                <h1>Quotation</h1>
                <div className="subline">
                  <EditText editMode={editMode} value={quotation.projectTitle} onChange={(val) => onChange("projectTitle", val)} placeholder="Project / Quotation Title" />
                </div>

                <div className="info-table">
                  <div className="info-row">
                    <div className="info-cell">
                      <strong>Quotation</strong>
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

                {/* Project Description */}
                <div className="block">
                  <h4>Project Description</h4>
                  {editMode ? (
                    <EditArea editMode rows={4} value={htmlToPlainText(descriptionValue)} onChange={(val) => onChange("description", val)}
                      placeholder="Describe the project..." />
                  ) : (
                    <RichOrPlainView value={descriptionValue} as="paragraph" />
                  )}
                </div>

                {/* Scope of Work */}
                {(editMode || (quotation.scopeOfWork && quotation.scopeOfWork.trim())) && (
                  <div className="block">
                    <h4>Scope of Work</h4>
                    {editMode ? (
                      <>
                        <div className="terms-templates">
                          {SCOPE_TEMPLATES.map((tpl) => (
                            <button
                              key={tpl.label}
                              type="button"
                              className={`terms-template-btn${activeScopeTemplate === tpl.label ? " active" : ""}`}
                              onClick={() => {
                                setActiveScopeTemplate(tpl.label);
                                onChange("scopeOfWork", tpl.text);
                              }}
                            >
                              {tpl.label}
                            </button>
                          ))}
                          <button
                            type="button"
                            className={`terms-template-btn${activeScopeTemplate === "Custom" ? " active" : ""}`}
                            onClick={() => {
                              setActiveScopeTemplate("Custom");
                              onChange("scopeOfWork", "");
                            }}
                          >
                            + Custom
                          </button>
                        </div>
                        <EditArea editMode rows={4} value={htmlToPlainText(quotation.scopeOfWork)} onChange={(val) => { setActiveScopeTemplate("Custom"); onChange("scopeOfWork", val); }} placeholder="One item per line..." />
                      </>
                    ) : (
                      <RichOrPlainView value={quotation.scopeOfWork} />
                    )}
                  </div>
                )}

                {/* Deliverables */}
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

                {/* Technology Used */}
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

                {/* Custom Sections */}
           {!editMode && v.customSections.map((s, i) => (
  <div className="block" key={i}>
    <h4>{s.title || s.heading}</h4>
    {s.type === "table" ? (
      <table className="cost-summary">
        <thead><tr>{(s.columns || []).map((col, ci) => <th key={ci}>{col}</th>)}</tr></thead>
        <tbody>
          {(s.rows || []).map((row, ri) => (
            <tr key={ri}>{row.map((cell, ci) => <td key={ci}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    ) : s.contentHtml
      ? <RichBlock html={s.contentHtml} />
      : Array.isArray(s.lines)
        ? <ul>{s.lines.map((l, j) => <li key={j}>{l}</li>)}</ul>
        : <RichOrPlainView value={s.content} as="paragraph" />}
  </div>
))}
                {editMode && (
                  <div className="block">
                    <h4>Custom Sections</h4>
                    <CustomSectionsEdit sections={quotation.customSections || []} accent={accent} onChange={onCustomSectionChange} onAdd={onAddCustomSection} onRemove={onRemoveCustomSection} />
                  </div>
                )}

                {/* Project Cost */}
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
                              <tr>
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

                {/* Project Timeline */}
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

      {/* Payment Terms */}
{(editMode || (quotation.paymentTerms && quotation.paymentTerms.trim())) && (
  <div className="block">
    <h4>Payment Terms</h4>
    {editMode ? (
      <EditArea
        editMode
        rows={3}
        value={htmlToPlainText(quotation.paymentTerms)}
        onChange={(val) => onChange("paymentTerms", val)}
        placeholder="Payment terms..."
      />
    ) : (
      <RichOrPlainView value={quotation.paymentTerms} />
    )}
  </div>
)}

{/* Terms & Conditions */}
{(editMode || (quotation.terms && quotation.terms.trim())) && (
  <div className="terms">
    <h4>Terms &amp; Conditions</h4>
    {editMode ? (
      <>
        <div className="terms-templates">
          {TERMS_TEMPLATES.map((tpl) => (
            <button
              key={tpl.label}
              type="button"
              className={`terms-template-btn${activeTermsTemplate === tpl.label ? " active" : ""}`}
              onClick={() => {
                setActiveTermsTemplate(tpl.label);
                onChange("terms", linesToHtmlList(tpl.text));
              }}
            >
              {tpl.label}
            </button>
          ))}
          <button
            type="button"
            className={`terms-template-btn${activeTermsTemplate === "Custom" ? " active" : ""}`}
            onClick={() => {
              setActiveTermsTemplate("Custom");
              onChange("terms", "");
            }}
          >
            + Custom
          </button>
        </div>
              <EditArea
          editMode
          rows={6}
          value={htmlToPlainText(quotation.terms)}
          onChange={(val) => {
            setActiveTermsTemplate("Custom");
            onChange("terms", linesToHtmlList(val));
          }}
          placeholder="One term per line..."
        />
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

                        {/* Note */}
                        {(editMode || quotation.notes?.trim()) && (
                          <div className="block">
                            <h4>Note</h4>
                            {editMode ? (
                              <EditArea editMode rows={2} value={htmlToPlainText(quotation.notes)} onChange={(val) => onChange("notes", val)}
                                placeholder="Additional notes..." />
                            ) : (
                              <RichOrPlainView value={quotation.notes} as="paragraph" />
                            )}
                          </div>
                        )}

                        <div className="sign">
                          <div>
                            <div className="sig-box"></div>
                            <div className="sign-line"></div>
                            <div className="who">{quotation.name}</div>
                          </div>
                          <div>
                            <div className="sig-box">
                              <SignatureEdit editMode={editMode} signature={quotation.signature} onUpload={onSignatureUpload} onRemove={onRemoveSignature}
                                inputId="bold-sig" boxStyle={{ maxHeight: 44, width: editMode ? 150 : "auto", height: editMode ? 44 : "auto" }} />
                            </div>
                            <div className="sign-line"></div>
                            <div className="who">{quotation.issuerName}</div>
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
                      </td>
                  </tr>
          </tbody>
            </table>
          </div>
      </div>
      );
}