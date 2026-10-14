import { getQuotationView, getCostLines, getCostItems, splitCostLine, htmlToPlainText, mobileCss } from "./quotationLayoutUtils"; import { useState } from "react";
import { EditText, EditArea, LogoEdit, SignatureEdit, CostItemsTable, CustomSectionsEdit, CompanySelect, CustomerSelect, RichOrPlainView } from "./EditableField";
const TERMS_TEMPLATES = [
  { label: "Standard", text: "50% advance payment required to begin work, balance due on delivery.\nDelivery timelines are estimates and may shift with scope changes.\nRevisions beyond the agreed scope will be billed separately.\nThis quotation is valid for 15 days from the date of issue." },
  { label: "Project-based", text: "This quotation is valid for 30 days from the date of issue.\nAny additional work outside the agreed scope will be charged separately.\n50% advance payment is required before project commencement.\nFinal deliverables handed over after full payment is received." },
  { label: "Retainer / Service", text: "This agreement covers services rendered on a monthly retainer basis.\nInvoices are due within 15 days of receipt.\nEither party may terminate this agreement with 30 days' written notice.\nUnused hours do not roll over to the following month." },
  {
    label: "Full Legal Agreement",
    text:
      `1. Parties
This Agreement is entered into between the Service Provider and the Client named in this quotation.

2. Project Scope
The Service Provider will design and develop the work as per the agreed project proposal. Any changes to the initial scope may incur additional charges and must be confirmed in writing by both parties.

3. Fees and Payment
The Client agrees to pay all fees as outlined in the approved quotation. Payments shall follow the schedule mentioned in the proposal. All charges are exclusive of applicable taxes, which will be added as required by law.

4. Intellectual Property & Source Code Access
The Client will have full rights to use the final deliverable as delivered. However, the source code and underlying development files will remain with the Service Provider and are not included as part of the project delivery, unless otherwise agreed in writing.

5. Usage Restrictions
The Client agrees to use the deliverables solely for lawful and intended purposes. Any misuse, including unethical, unauthorized, or illegal use, is strictly prohibited.

6. Confidentiality
Both parties agree to treat all shared information as confidential. The Service Provider will not disclose any business, strategic, or proprietary information shared by the Client without prior consent, unless required by law.

7. Warranty and Support
A one-year warranty period is provided from the date of delivery. During this time, any functional bugs or code issues identified will be resolved at no additional cost to the Client.

8. Termination
Either party may terminate this Agreement with written notice if the other party commits a material breach. Upon termination, the Client retains rights to the delivered work as-is. Future updates or support will not be included post-termination unless agreed separately.

9. Governing Law and Jurisdiction
This Agreement shall be governed by applicable local laws. Any disputes arising under this Agreement shall fall under the exclusive jurisdiction of the courts local to the Service Provider.

ACCEPTANCE OF TERMS
By confirming, the Client acknowledges that they have read, understood, and agree to be bound by these terms and conditions. The Client can confirm their acceptance by responding to this quotation.`
  },
  {
    label: "Simple Freelance",
    text:
      `Scope: Work will proceed strictly as described in this quotation. Anything outside this scope will be quoted separately.

Payment: 50% upfront, 50% on completion. Late payments beyond 7 days of the due date may incur a 2% monthly late fee.

Revisions: Up to 2 rounds of revisions are included. Additional revisions are billed at the standard hourly rate.

Ownership: Full ownership of final files transfers to the Client upon receipt of full payment.

Cancellation: If the Client cancels after work has begun, the advance payment is non-refundable and covers work completed to date.

Validity: This quotation is valid for 15 days from the date of issue.`
  },
  {
    label: "Fixed-Bid Milestone",
    text:
      `Milestones: Payment is released in three equal milestones — on kickoff, on mid-project delivery, and on final handover.
Scope Freeze: Scope is locked once this quotation is accepted; changes require a signed change order and may adjust cost and timeline.
Acceptance: The Client has 5 business days to review each milestone deliverable and request revisions before it is considered accepted.
Delays: Delays caused by late feedback or missing assets from the Client's side may extend the project timeline accordingly.
Validity: This quotation is valid for 20 days from the date of issue.`
  },
];

const styles = `
.qd-classic{
  --green:#0e1f18; --gold:#b08d3e; --ink:#22201b; --muted:#6a655a; --line:#c9c2b0; --paper:#fbfaf6;
  background:#e9e6dd; font-family:'Georgia','Times New Roman',serif; color:var(--ink);
  padding:40px 20px;
}
.qd-classic .sheet{ max-width:780px; margin:0 auto; background:var(--paper); border:1px solid var(--line); padding:56px 60px; }
.qd-classic .crest{ text-align:center; margin-bottom:10px; }
.qd-classic .crest .mark{ width:76px;height:76px;border:2px solid var(--gold);border-radius:50%; margin:0 auto 12px; display:flex;align-items:center;justify-content:center; font-size:22px;color:var(--gold);font-weight:bold; overflow:hidden; padding:8px; box-sizing:border-box; }
.qd-classic .crest .mark img{ width:100%; height:100%; object-fit:contain; }
.qd-classic .crest h2{ margin:0; letter-spacing:3px; font-size:18px; font-weight:bold; text-transform:uppercase; color:var(--ink); }
.qd-classic .crest .addr{ margin:4px 0 0; font-size:11px; letter-spacing:0.5px; color:var(--muted); }
.qd-classic hr{ border:none; border-top:1px solid var(--gold); margin:26px 0; }
.qd-classic h1{ text-align:center; font-size:26px; letter-spacing:6px; font-weight:normal; color:var(--green); margin:0 0 8px; text-transform:uppercase; }
.qd-classic .project-title{ text-align:center; font-size:13px; letter-spacing:1px; color:var(--muted); margin:0 0 30px; }
.qd-classic .meta-table{ width:100%; border-collapse:collapse; font-size:13px; margin-bottom:28px; break-inside:avoid; page-break-inside:avoid; }
.qd-classic .meta-table td{ vertical-align:top; padding:12px 16px; border:1px solid var(--line); line-height:1.8; }
.qd-classic .meta-table h4{ margin:0 0 4px; font-size:12px; font-weight:bold; letter-spacing:1px; text-transform:uppercase; color:var(--gold); }
.qd-classic .reference-row{ font-size:12px; color:var(--muted); text-align:right; padding:0 16px 0 0; margin-bottom:14px; display:flex; justify-content:flex-end; gap:18px; }
.qd-classic .reference-row > *{ max-width:160px; }
.qd-classic .totals{ width:280px; margin-left:auto; margin-top:12px; font-size:13px; }
.qd-classic .totals .row{ display:flex; justify-content:space-between; padding:5px 6px; }
.qd-classic .totals .grand{ margin-top:4px; font-weight:normal; font-size:13px; color:var(--ink); }

.qd-classic table.cost-summary{ width:100%; border-collapse:collapse; margin-top:6px; }
.qd-classic .cost-summary thead th{ background:var(--gold); color:#fff; text-align:left; font-size:12px; letter-spacing:0.5px; font-weight:bold; padding:8px 12px; border:none; }
.qd-classic .cost-summary thead th.num{ text-align:right; }
.qd-classic .cost-summary tbody td{ padding:7px 12px; font-size:13px; color:var(--ink); border-bottom:1px solid var(--line); }
.qd-classic .cost-summary tbody td.num{ text-align:right; }
.qd-classic .cost-summary tfoot td{ padding:10px 12px; font-size:13.5px; font-weight:bold; border-top:2px solid var(--ink); }
.qd-classic .cost-summary tfoot td.num{ text-align:right; }
.qd-classic .terms{ margin-top:36px; font-size:12px; line-height:1.9; color:var(--ink); }
.qd-classic .terms h4{ color:var(--ink); font-style:italic; font-weight:bold; font-size:17px; margin:0 0 8px; break-after:avoid; page-break-after:avoid; }
.qd-classic .terms ul{ margin:0; padding-left:18px; }
.qd-classic .terms li{ margin-bottom:4px; break-inside:avoid; page-break-inside:avoid; }

.qd-classic .block{ margin-top:28px; }
.qd-classic .block h4{ color:var(--ink); font-style:italic; font-weight:bold; font-size:17px; margin:0 0 8px; break-after:avoid; page-break-after:avoid; }
.qd-classic .block p{ margin:0; font-size:13px; line-height:1.8; break-inside:avoid; page-break-inside:avoid; }

.qd-classic .block ul{ margin:0; padding-left:18px; font-size:13px; line-height:1.9; }
.qd-classic .block li{ break-inside:avoid; page-break-inside:avoid; }
.qd-classic .sign{ display:flex; justify-content:space-between; gap:60px; margin-top:70px; font-size:13px; break-inside:avoid; page-break-inside:avoid; }
.qd-classic .sign div{ flex:1; text-align:center; }
.qd-classic .sign div:first-child{ text-align:left; }
.qd-classic .sign div:last-child{ text-align:right; }
.qd-classic .sign .space{ height:50px; display:flex; align-items:flex-end; justify-content:center; }
.qd-classic .sign div:last-child .space{ justify-content:flex-end; }
.qd-classic .sign div:first-child .space{ justify-content:flex-start; }
.qd-classic .sign .sign-line{ border-top:1px solid var(--ink); padding-top:8px; font-style:italic; color:var(--ink); }
.qd-classic .footer-bar{ margin-top:24px; padding-top:14px; border-top:1px solid var(--gold); display:flex; justify-content:space-between; flex-wrap:wrap; gap:6px; font-size:11px; color:var(--muted); break-inside:avoid; page-break-inside:avoid; }
.qd-classic .terms-tpl-row{ display:flex; flex-wrap:wrap; gap:8px; margin-bottom:10px; }
.qd-classic .terms-tpl-row button{ font-family:inherit; }
.qd-classic .page-frame{ width:100%; border-collapse:collapse; }
.qd-classic .page-frame > thead > tr > td,
.qd-classic .page-frame > tbody > tr > td,
.qd-classic .page-frame > tfoot > tr > td{ padding:0; border:none; }

@media print {
  @page{ size: A4; margin: 0; }
  .qd-classic{ background:#fff; padding:0; margin:0; }
  .qd-classic .sheet{ border:none; padding:0 15mm; max-width:100%; margin:0; }
  .qd-classic .sign{ margin-top:36px; }
  .qd-classic .footer-bar{ page-break-after:avoid; }
  .qd-classic .sign-footer-group{ break-inside:avoid; page-break-inside:avoid; }
    .qd-classic .page-frame > thead > tr > td,
  .qd-classic .page-frame > tfoot > tr > td{ height:12mm; }
  .qd-classic .page-frame > thead{ display:table-header-group; }
  .qd-classic .page-frame > tfoot{ display:table-footer-group; }
  .qd-classic table thead{ display:table-header-group; }
  .qd-classic table tr{ break-inside:avoid; page-break-inside:avoid; }
  .qd-classic .page-frame > tbody > tr{ break-inside:auto; page-break-inside:auto; }
}`;

const CLASSIC_MOBILE = `
  & .sheet{ padding:24px 16px !important; border:none !important; }
  & .crest h2{ font-size:15px !important; letter-spacing:1.5px !important; }
  & h1{ font-size:22px !important; letter-spacing:4px !important; }
  & .project-title{ margin-bottom:20px !important; }
  & .reference-row{ justify-content:center !important; flex-wrap:wrap !important; padding:0 !important; }
  & .reference-row > *{ max-width:none !important; }
  & .meta-table, & .meta-table tbody, & .meta-table tr, & .meta-table td{ display:block !important; width:100% !important; box-sizing:border-box; }
  & .meta-table td + td{ border-top:none !important; }
`;


export default function ClassicLayout({
  quotation, companyInfo, customers = [], editMode = false, onChange = () => { },
  onCustomSectionChange = () => { }, onAddCustomSection = () => { }, onRemoveCustomSection = () => { },
  onLogoUpload = () => { }, onRemoveLogo = () => { },
  onSignatureUpload = () => { }, onRemoveSignature = () => { },
  onApplyCost = () => { }, defaultGstPercent = 18,
}) {
  const v = getQuotationView(quotation, companyInfo);
  const costLines = getCostLines(quotation, defaultGstPercent); const accent = "#b08d3e";
  const [showAddItem, setShowAddItem] = useState(false);
  const defaultDescription = `This proposal outlines the scope of work agreed upon between ${v.issuerName || "Your Company"} and ${v.clientCompany || "the client"}.`; const descriptionValue = quotation.description || defaultDescription;

  // Populates the whole "To" block from one picked customer record.
  // Only the client-side fields are touched — everything else on the
  // quotation (cost, terms, template, etc.) is left exactly as-is.
  const handleCustomerSelect = (cust) => {
    onChange("customerId", cust.id);
    onChange("company", cust.company || "");
    onChange("name", cust.name || "");
    onChange("phone", cust.phone || "");
    onChange("email", cust.email || "");
    onChange("clientAddress", cust.address || "");
  };

  // Typed a company name that isn't in the saved Customer list — set it
  // as free text and clear customerId, since it isn't linked to a saved
  // customer record. The rest of the "To" fields stay editable as normal
  // text inputs below, so name/phone/email/address can still be filled in.
  const handleCustomerManualChange = (typedName) => {
    onChange("customerId", null);
    onChange("company", typedName);
  };
  return (
      <div className="qd-classic">
      <style>{styles}{mobileCss(".qd-classic", CLASSIC_MOBILE)}</style>
      <div className="sheet">
        <table className="page-frame">
          <thead><tr><td /></tr></thead>
          <tbody><tr><td>

        <div className="crest">
         <LogoEdit
  editMode={editMode} logo={quotation.logo} onUpload={onLogoUpload} onRemove={onRemoveLogo}
  inputId="classic-logo"
  boxStyle={{
    width: 76, height: 76,
    border: "none",
    backgroundColor: "transparent",
  }}
  shape={quotation.logoShape} onShapeChange={(s) => onChange("logoShape", s)}
  fallback={null}
/>
          <h2>
            <CompanySelect editMode={editMode} value={quotation.issuerName} onChange={(val) => onChange("issuerName", val)}
              placeholder="Your Company Name" style={{ textAlign: "center" }} />
          </h2>
          {(editMode || v.issuerAddress) && (
            <p className="addr">
              <EditText editMode={editMode} value={quotation.issuerAddress} onChange={(val) => onChange("issuerAddress", val)}
                placeholder="Company address" style={{ textAlign: "center" }} />
            </p>
          )}
        </div>
        <hr />

        <h1>Quotation</h1>
        {(editMode || v.projectTitle) && (
          <p className="project-title">
            <EditText editMode={editMode} value={quotation.projectTitle} onChange={(val) => onChange("projectTitle", val)}
              placeholder="Project / Quotation Title" style={{ textAlign: "center" }} />
          </p>
        )}

             <div className="reference-row">
          <span>
            {quotation.quotationNumber
              ? quotation.quotationNumber
              : <span style={{ opacity: 0.6, fontStyle: "italic" }}>Draft — number assigned on send</span>}
          </span>
          <EditText editMode={editMode} type="date" value={quotation.date} onChange={(val) => onChange("date", val)} />
        </div>

        <table className="meta-table">
          <tbody>
            <tr>
              <td>
                <h4>Presented To</h4>
                <CustomerSelect editMode={editMode} as="div" customers={customers} value={quotation.company} onSelect={handleCustomerSelect} onManualChange={handleCustomerManualChange} placeholder="Select or search customer" viewRender={(val) => <div>Company: {val}</div>} />
                <EditText editMode={editMode} as="div" value={quotation.name} onChange={(val) => onChange("name", val)} placeholder="Client contact name" viewRender={(val) => <div>Name: {val}</div>} />
                <EditText editMode={editMode} as="div" value={quotation.clientAddress} onChange={(val) => onChange("clientAddress", val)} placeholder="Client address" viewRender={(val) => <div>Address: {val}</div>} />
                <EditText editMode={editMode} as="div" value={quotation.phone} onChange={(val) => onChange("phone", val)} placeholder="Phone" viewRender={(val) => <div>Mob: {val}</div>} />
                <EditText editMode={editMode} as="div" value={quotation.email} onChange={(val) => onChange("email", val)} placeholder="Email" viewRender={(val) => <div>Email: {val}</div>} />
              </td>
              <td>
                <h4>From</h4>
                <CompanySelect editMode={editMode} as="div" value={quotation.issuerName} onChange={(val) => onChange("issuerName", val)} placeholder="Your Company Name" viewRender={(val) => <div>Company: {val}</div>} />
                <EditText editMode={editMode} as="div" value={quotation.issuerAddress} onChange={(val) => onChange("issuerAddress", val)} placeholder="Company address" viewRender={(val) => <div>Address: {val}</div>} />
                <EditText editMode={editMode} as="div" value={quotation.issuerPhone} onChange={(val) => onChange("issuerPhone", val)} placeholder="Phone" viewRender={(val) => <div>Mob: {val}</div>} />
                <EditText editMode={editMode} as="div" value={quotation.issuerEmail} onChange={(val) => onChange("issuerEmail", val)} placeholder="Email" viewRender={(val) => <div>Email: {val}</div>} />
              </td>
            </tr>
          </tbody>
        </table>

        <div className="block">
          <h4>Project Description</h4>
          <EditArea editMode={editMode} rows={4} value={htmlToPlainText(descriptionValue)} onChange={(val) => onChange("description", val)}
            placeholder="Describe the project..." viewRender={(val) => <RichOrPlainView value={val} as="paragraph" />} />
        </div>

        {(editMode || (quotation.scopeOfWork && quotation.scopeOfWork.trim())) && (
          <div className="block">
            <h4>Scope of Work</h4>
            {editMode ? (
              <EditArea editMode rows={4} value={htmlToPlainText(quotation.scopeOfWork)} onChange={(val) => onChange("scopeOfWork", val)} placeholder="One item per line..." />
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



        {!editMode && v.customSections.map((s, i) => (
          <div className="block" key={i}>
            <h4>{s.title}</h4>
            {s.type === "table" ? (
              <table className="cost-summary">
                <thead><tr>{(s.columns || []).map((col, ci) => <th key={ci}>{col}</th>)}</tr></thead>
                <tbody>
                  {(s.rows || []).map((row, ri) => (
<tr key={ri}>
  {(Array.isArray(row) ? row : Object.values(row || {})).map((cell, ci) => (
    <td key={ci}>{String(cell ?? "")}</td>
  ))}
</tr>                  ))}
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
                gstMode={quotation.gstMode || (quotation.includeGst === true ? "with" : "without")}
                gstPercent={quotation.gstPercent}
                defaultGstPercent={defaultGstPercent}
                onGstChange={onChange}
                accent={accent}
              />
            ) : (
              <table className="cost-summary">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th style={{ textAlign: "center", width: 60 }}>Qty</th>
                    <th className="num">Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {costLines.rows.map((row, i) => (
                    <tr key={i}>
                      <td>{row.label}</td>
                      <td style={{ textAlign: "center" }}>{row.qty}</td>
                      <td className="num">{row.value}</td>
                    </tr>
                  ))}
                </tbody>
                {costLines.grandLine && (() => {
                  const [label, value] = splitCostLine(costLines.grandLine);
                  return <tfoot><tr><td colSpan={2}>{label}</td><td className="num">{value}</td></tr></tfoot>;
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
                <div className="terms-tpl-row">
                  {TERMS_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.label} type="button" onClick={() => onChange("terms", tpl.text)}
                      title={`Use "${tpl.label}" terms template`}
                      style={{
                        border: quotation.terms === tpl.text ? `1.5px solid ${accent}` : "1px solid #c9c2b0",
                        borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                        backgroundColor: quotation.terms === tpl.text ? `${accent}22` : "#fff",
                        color: quotation.terms === tpl.text ? accent : "#6a655a",
                      }}
                    >
                      {tpl.label}
                    </button>
                  ))}
                  <button
                    type="button" onClick={() => onChange("terms", "")}
                    title="Write your own custom terms"
                    style={{
                      border: quotation.terms === "" ? `1.5px dashed ${accent}` : "1px dashed #c9c2b0",
                      borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                      backgroundColor: quotation.terms === "" ? `${accent}22` : "#fff",
                      color: quotation.terms === "" ? accent : "#6a655a",
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
        <div className="sign-footer-group">
        <div className="sign">
          <div>
            <div className="space"></div>
            <div className="sign-line">{quotation.name}</div>
          </div>
          <div>
            <div className="space">
              <SignatureEdit editMode={editMode} signature={quotation.signature} onUpload={onSignatureUpload} onRemove={onRemoveSignature}
                inputId="classic-sig" boxStyle={{ maxHeight: 48, width: editMode ? 150 : "auto", height: editMode ? 48 : "auto" }} />
            </div>
            <div className="sign-line">{quotation.issuerName}</div>
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

          </td></tr></tbody>
          <tfoot><tr><td /></tr></tfoot>
        </table>
      </div>
    </div>
  );
}