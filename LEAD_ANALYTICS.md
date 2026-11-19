# Lead & Marketing Analytics

## What the lead module tracks
- Lead date and source: Justdial, IndiaMART, WhatsApp, Customer Referral, Google/Website, Facebook/Instagram, Walk-in, Existing Customer, Contractor/Builder, Other.
- Source detail for agent/account/campaign names.
- Customer and contact details.
- Customer type: Homeowner, Contractor, Builder, Dealer, Institution, Other.
- Site/project location.
- Product/service interest and free-text requirement.
- Expected quantity and estimated order value.
- Status: New, Contacted, Qualified, Follow-up, Quoted, Won, Lost.
- Priority, next follow-up date, remarks, lost reason and converted invoice number.

## Dashboard insights
The dashboard now shows:
- Total leads, open pipeline, won leads and follow-ups due.
- Monthly lead-growth graph.
- Source performance by lead count, won count and estimated value.
- Lead-status pipeline so stalled stages are visible.
- Follow-up queue for the next action.
- Lead conversion percentage and estimated pipeline value.

## Google Sheet
On the next successful bootstrap, Apps Script creates a `Leads` sheet automatically if it does not exist. The first row is created with the required headers by `ensureSheets_()`.

## Recommended data discipline
For useful analysis, staff should:
1. Enter every genuine enquiry as a lead.
2. Always select the real source.
3. Enter estimated order value once the requirement is understood.
4. Keep the status updated after every call/WhatsApp follow-up.
5. Set a next follow-up date for every open lead.
6. Enter a lost reason when a lead is marked Lost.
7. Enter the invoice number when a lead becomes Won.
