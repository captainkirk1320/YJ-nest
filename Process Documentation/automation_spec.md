# Technical Specification & Automation Blueprint: Sales Report Connect

**Target Context:** Process Automation Specifications for Claude Code  
**System Architecture:** SeatGeek/Unify & Salesforce CRM Data Pipeline  
**Source Material:** Process Architecture Review Meetings (Parts 1 & 2)

---

## 1. Project Overview & Business Goal
The objective of this project is to eliminate a highly manual, labor-intensive data reconciliation workflow. The system matches ticket sales data generated from individual promotional tracking links with internal CRM volunteer tracking ledgers, ultimately updating an executive impact dashboard.

### Current State Bottlenecks
* **Fragmented Data Sources:** Disparate data silos across ticketing engines, custom web platforms, and CRMs.
* **Manual Lookups:** Heavy reliance on manual file exports and spreadsheet-level matching mechanics (`VLOOKUP`) to reconcile records.
* **Error-Prone Auditing:** Manual validation of processing logs to ensure sync success.

---

## 2. System Touchpoints & Environment Map

### A. The Ingestion Layer (Ticketing Data)
* **SeatGeek Enterprise:** The primary transactional engine. Tracks active ticket sales generated via specific, custom-attributed marketing links (e.g., promotional campaigns for the Rate Bowl, Fiesta Bowl, Par 3, Kick-off Event etc.).
* **Unify (Paciolan/SeatGeek Platform):** The back-end client management and ticketing database. Serves as the source of truth for raw transaction tallies, seat allocations, financial totals, and event attendance metrics.

### B. The CRM Layer (Roster & Records)
* **Salesforce CRM:** The system of record for personnel management. Houses master rosters, contact verification directories, and logs structural data like completed volunteer hours and assigned points metrics. It will also house any fundraising data not present in seatgeek, e.g. sponsorships, in-kind donations, and donations made directly through the organization (as opposed to via SeatGeek).

### C. The Presentation Layer (The Dashboard)
* **YJ's Nest Application ("Yellow Jackets" Portal):** A specialized builder workspace displaying high-level campaign KPIs. It tracks high-level operational performance values including **Total Raised**, **Total Points**, **Unique Donors**, and specific sub-campaign engagement numbers. Google AI Studio has helped to build out an MVP of this application.

---

## 3. Step-by-Step Process & Visual Checkpoints

### Phase 1: Ticketing Verification & Ingestion (SeatGeek & Unify)
1. **Event Data Audit:** Review transaction volume and unique tracking URL performance natively inside the Unify interface to verify baseline ticket allocations.
   * `[SCREENSHOT PLACEHOLDER: docs/images/unify_event_audit.png]`
2. **Dashboard Reconciliation:** Cross-reference high-level financial summary metrics inside the Nest application workspace.
   * `[SCREENSHOT PLACEHOLDER: docs/images/nest_dashboard_kpis.png]`

### Phase 2: Salesforce Roster Preparation
1. **Roster Auditing:** Query target data reports in Salesforce (e.g., *Yellow Jacket Directory*, *2026-27 Gorlocks*) to generate an active list of target personnel and their current status flags.
   * `[SCREENSHOT PLACEHOLDER: docs/images/salesforce_report_engine.png]`
2. **Data Export:** Pull down raw tabular data from the CRM system to use as the baseline lookup table.
   * `[SCREENSHOT PLACEHOLDER: docs/images/master_volunteer_matrix.png]`

### Phase 3: The Excel Transformation Layer
Currently, data reconciliation happens inside an Excel ecosystem by running cross-sheet lookups to match SeatGeek transactions to Salesforce records.

1. **Pivot View Generation:** Summarizing raw transactional rows by personnel identifier strings.
   * `[SCREENSHOT PLACEHOLDER: docs/images/excel_pivot_summary.png]`
2. **Lookup Reconciliations:** Applying formulas to link disparate data rows together. 
   * `[SCREENSHOT PLACEHOLDER: docs/images/data_reconciliation_grid.png]`
3. **Core Transformation Logic:**
   ```excel
   =VLOOKUP(A2, '2026-27 Gorlocks'!$A$1:$H$100, 4, FALSE)

   Logic: Evaluates the tracking identifier from Column A, scans the fresh Salesforce export matrix, and passes back the designated points calculation into the core tracking tab.
### Phase 4: Bulk Salesforce Data Loading
1.	Salesforce Data Import Wizard: Accessing data import configurations to push reconciled updates back into the CRM.
•	[SCREENSHOT PLACEHOLDER: docs/images/sf_data_import_wizard.png]
2.	Target Field Mapping Schema:
The pipeline explicitly targets the Volunteer Hours object utilizing these field alignments:
•	Contact ID: Salesforce Master Record ID matching.
•	Volunteer Job: Campaign classification identifiers.
•	Status: Hardcoded string state (Completed).
•	Hours Worked / Volunteer Points: Processed numerical values derived from the transformation layer.
•	Planned Start Date & Time: Transaction/Event timestamp structures.
•	[SCREENSHOT PLACEHOLDER: docs/images/sf_field_mapping_matrix.png]
3.	Bulk Queue Monitoring: Reviewing execution logs to catch exceptions, row skips, or formatting failures.
•	[SCREENSHOT PLACEHOLDER: docs/images/sf_bulk_processing_queue.png]
4. Target Automation Architecture
To eliminate the manual steps, the system will use a script-driven middleware architecture:
  [ SeatGeek / Unify API ]              [ Salesforce API ]
             │                                   │
   (Fetch Ticket Metrics)              (Fetch Volunteer Roster)
             │                                   │
             └───► [ Python / Node.js Engine ] ◄─┘
                            │
              (Programmatic Dataset Merging)
                            │
                            ├──► Updates Salesforce Objects via API
                            └──► Syncs Nest Dashboard Metrics

Technical Requirements for the Script
	1.	Data Joining: Replace the manual Excel VLOOKUP with a programmatic data merge (e.g., using pandas in Python or an in-memory join algorithm in Node.js) using the custom tracking links as matching keys.
	2.	Idempotency & Safety: The script must handle partial data, clean out #N/A validation string errors gracefully, and log missing matches for human review without breaking execution.
	3.	API Integration Capability: Built with modular request components so that static CSV file parsing logic can easily adapt to live API endpoints down the line.
5. Directives for Claude Code Initialization
When deploying this document into the terminal development workspace environment, execute the following prompt sequence:
Initialize a data pipeline workspace based on the parameters outlined in automation_spec.md. Write a modular script that mocks the manual process: 
1. Ingests raw ticket data (simulating SeatGeek/Unify metrics).
2. Ingests individual personnel rosters (simulating the Salesforce export).
3. Matches the records together programmatically based on campaign tracking links.
4. Generates a clean output payload formatted for Salesforce Import Wizard compliance, complete with a robust error-catching log for missing matches.

### File Context
1. Manual Tweaks for YJ Report.docx - This an example of exceptions discussed and logged during the manual process that need to be accounted for in the automated process.
2. Report Data - 2026-05-18T140432.139.csv - this is an example of raw ticket data from Seatgeek/unify that will be automated for download.
3. YJ Directory - Sales Report Info-2026-05-18-15-04-24 - this is an example roster download from salesforce for Active Yellow Jackets. This report does not include 12 new members (titled "Futures") and it is also missing contact info for a number of active members.
4. 2026-27 Gorlocks-2026-05-18-14-34-26 - this is an example of a download from salesforce showcasing a dollar credit and points from a meeting the person attended.
5. 26-27 YJ SeatGeek Sales Rep IDs - this is a map of Yellow Jackets (aka Committee Member), Life Members, Life Director, Board, and Futures to specific sales rep id's used to generate tracking links to assign to each member.
6. 26-27 Sales Rosters - includes the current Yellow Jacket sales rosters (we split into teams for fundraising). The first person listed on each team is the captain. This list includes phone numbers and last year's fundraising data.
7. Process Meeting transcript.rtf - transcript that led to the development of this document.