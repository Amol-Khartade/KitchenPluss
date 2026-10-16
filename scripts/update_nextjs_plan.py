import sys
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

EXCEL_PATH = Path("docs/KitchenPluss AI Integration Plan.xlsx")

def update_plan():
    wb = openpyxl.load_workbook(EXCEL_PATH)
    sheet1 = wb["Sheet1"]

    # 1. Update Day 2 (Row 8) to reflect Next.js Full-Stack & Shared Monorepo Core execution today
    day2_data = {
        "focus": "Next.js Full-Stack & DRY Shared Core",
        "task": "Initialize Next.js 15 App Router in web/ and extract @kitchenpulse/shared monorepo package (Zod schemas, DTOs, types) to eliminate code duplication across web and mobile.",
        "standup": "I migrated web to Next.js 15 App Router with full-stack Route Handlers and extracted @kitchenpulse/shared to eliminate duplicate types across web and mobile.",
        "status": "In Progress"
    }
    sheet1.cell(row=8, column=3).value = day2_data["focus"]
    sheet1.cell(row=8, column=4).value = day2_data["task"]
    sheet1.cell(row=8, column=5).value = day2_data["standup"]
    sheet1.cell(row=8, column=6).value = day2_data["status"]

    # 2. Update Week 4 in Sheet1 (Rows 22-26)
    week4_updates = {
        22: {
            "day": "Day 16",
            "focus": "KDS WebSocket Optimization & Mobile Sync",
            "task": "Optimize Socket.IO channels for sub-50ms latency across kitchen stations and configure offline reconnect buffers for tablets.",
            "standup": "I optimized the real-time KDS Socket.IO channels for sub-50ms latency and configured offline event queuing for kitchen tablets.",
        },
        23: {
            "day": "Day 17",
            "focus": "Unified API Routes & Socket Server",
            "task": "Migrate Express API routes to Next.js Route Handlers (app/api/*) and attach custom Socket.IO server.ts for live KDS real-time events.",
            "standup": "I migrated backend routes into Next.js Route Handlers, serving both Web Server Components and the mobile Expo tablet app from a single API with live Socket.IO.",
        },
        24: {
            "day": "Day 18",
            "focus": "React Native Bottom Sheets & DRY UI",
            "task": "Build animated AI Recommendations sheet in mobile using React Native Reanimated and shared Zod schemas to review and approve draft supplier orders.",
            "standup": "I created a bottom sheet interface in React Native utilizing shared Zod schemas to review and approve AI-generated supplier orders.",
        },
        25: {
            "day": "Day 19",
            "focus": "E2E Integration & Bundle Optimization",
            "task": "Verify end-to-end flow: Mobile ticket firing -> Next.js API & Socket.IO -> AI Agent audit -> Bundle size optimization check.",
            "standup": "I ran end-to-end tests validating the unified Next.js + Mobile flow and confirmed significant client bundle size reductions via React Server Components.",
        },
        26: {
            "day": "Day 20",
            "focus": "Dockerization & Unified Deployment",
            "task": "Containerize unified Next.js full-stack + Python AI Agent + Postgres/pgvector stack with Docker Compose for production deployment.",
            "standup": "I containerized the full unified Next.js + Python AI microservice stack in Docker Compose, achieving a single consolidated deployment.",
        },
    }

    for row_idx, data in week4_updates.items():
        sheet1.cell(row=row_idx, column=3).value = data["focus"]
        sheet1.cell(row=row_idx, column=4).value = data["task"]
        sheet1.cell(row=row_idx, column=5).value = data["standup"]

    # 2. Add or recreate 'Next.js Architecture Plan' Sheet
    if "Next.js Architecture Plan" in wb.sheetnames:
        del wb["Next.js Architecture Plan"]

    arch_sheet = wb.create_sheet(title="Next.js Architecture Plan")
    arch_sheet.views.sheetView[0].showGridLines = True

    # Styling constants
    header_fill = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid") # Slate 900
    sub_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")    # Slate 800
    accent_fill = PatternFill(start_color="0284C7", end_color="0284C7", fill_type="solid") # Sky 600
    row_alt_fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid") # Slate 50
    border_thin = Side(border_style="thin", color="CBD5E1")
    box_border = Border(left=border_thin, right=border_thin, top=border_thin, bottom=border_thin)

    title_font = Font(name="Segoe UI", size=16, bold=True, color="FFFFFF")
    section_font = Font(name="Segoe UI", size=12, bold=True, color="FFFFFF")
    col_hdr_font = Font(name="Segoe UI", size=10, bold=True, color="FFFFFF")
    bold_font = Font(name="Segoe UI", size=9, bold=True, color="0F172A")
    regular_font = Font(name="Segoe UI", size=9, color="334155")

    # Title Banner
    arch_sheet.merge_cells("A1:E1")
    title_cell = arch_sheet["A1"]
    title_cell.value = "KitchenPulse — Next.js Full-Stack & DRY Monorepo Architecture Plan"
    title_cell.font = title_font
    title_cell.fill = header_fill
    title_cell.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    arch_sheet.row_dimensions[1].height = 40

    arch_sheet.merge_cells("A2:E2")
    sub_cell = arch_sheet["A2"]
    sub_cell.value = "Autonomous Commercial Kitchen Operations: Unified Next.js API, Shared Zod Core, and Client Bundle Reduction"
    sub_cell.font = Font(name="Segoe UI", size=10, italic=True, color="94A3B8")
    sub_cell.fill = header_fill
    sub_cell.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    arch_sheet.row_dimensions[2].height = 24

    # Table 1: Architecture Comparison Matrix
    arch_sheet.merge_cells("A4:E4")
    t1_title = arch_sheet["A4"]
    t1_title.value = "1. ARCHITECTURAL COMPARISON: VITE + EXPRESS vs. NEXT.JS FULL-STACK"
    t1_title.font = section_font
    t1_title.fill = accent_fill
    t1_title.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    arch_sheet.row_dimensions[4].height = 28

    headers1 = ["Architectural Dimension", "Current (Vite SPA + Express API)", "Target (Next.js 15 Full-Stack + Shared Core)", "DRY & Performance Impact", "Mobile Benefit"]
    for col_idx, h in enumerate(headers1, 1):
        cell = arch_sheet.cell(row=5, column=col_idx, value=h)
        cell.font = col_hdr_font
        cell.fill = sub_fill
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = box_border
    arch_sheet.row_dimensions[5].height = 26

    matrix_rows = [
        ("Code Duplication (DRY)", "Types and Zod schemas manually synced across 3 folders (backend, web, mobile)", "Single Source of Truth in @kitchenpulse/shared (Zod schemas, types, DTOs)", "100% elimination of redundant validation and DTO code", "Directly imports shared models into Expo app"),
        ("API Architecture", "Separate Express server (port 5000) + Vite proxy (port 3000)", "Unified Next.js App Router Route Handlers (app/api/* on port 3000)", "Consolidates deployment to 1 Node server instead of 2", "Expo mobile hits same /api endpoints as Web"),
        ("Web Bundle Size", "Vite bundles entire SPA (~358 KB client JS initial load)", "React Server Components (RSC) render heavy UI on server; client JS reduced by ~45-60%", "Zero client JS for static views; fast initial load on slow kitchen tablets", "Web preview runs faster with less memory"),
        ("Mobile App Size", "Duplicate client models, manual fetch wrappers", "Tree-shaken shared SDK; imports only active query hooks", "Reduces overall APK/IPA bundle footprint", "Synchronous MMKV + shared queries = instant startup"),
        ("Real-Time KDS (Socket.IO)", "Native Socket.IO on Express server (port 5000)", "Custom Next.js Node server (server.ts) binding Socket.IO to http.Server", "Retains sub-100ms real-time kanban transitions on port 3000", "Mobile and Web listen to same ws:// room channels"),
        ("Python AI Microservice", "FastAPI microservice on port 8000 in Docker", "FastAPI microservice on port 8000 preserved for Gemini/LangGraph", "Separation of Concerns: Python excels at AI; Node/Next.js at UI/API", "Direct SSE and REST streaming to both clients"),
    ]

    for r_idx, row in enumerate(matrix_rows, 6):
        arch_sheet.row_dimensions[r_idx].height = 36
        for c_idx, val in enumerate(row, 1):
            cell = arch_sheet.cell(row=r_idx, column=c_idx, value=val)
            cell.font = bold_font if c_idx == 1 else regular_font
            cell.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
            cell.border = box_border
            if r_idx % 2 == 1:
                cell.fill = row_alt_fill

    # Table 2: 5-Phase Migration Execution Roadmap
    start_r = 13
    arch_sheet.merge_cells(f"A{start_r}:E{start_r}")
    t2_title = arch_sheet[f"A{start_r}"]
    t2_title.value = "2. 5-PHASE EXECUTION ROADMAP & DRY IMPLEMENTATION"
    t2_title.font = section_font
    t2_title.fill = accent_fill
    t2_title.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    arch_sheet.row_dimensions[start_r].height = 28

    headers2 = ["Phase", "Milestone / Deliverable", "Core Technical Tasks", "Expected Outcome", "Target Week"]
    for col_idx, h in enumerate(headers2, 1):
        cell = arch_sheet.cell(row=start_r+1, column=col_idx, value=h)
        cell.font = col_hdr_font
        cell.fill = sub_fill
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = box_border
    arch_sheet.row_dimensions[start_r+1].height = 26

    plan_rows = [
        ("Phase 1: Core Extraction", "packages/shared Package", "Create @kitchenpulse/shared npm workspace. Extract Zod schemas (CreateTicket, Ingredient), TypeScript types, and food cost formulas.", "Single source of truth for Web, Mobile, and Backend", "Week 4 (Day 16)"),
        ("Phase 2: Next.js Scaffold", "Next.js 15 + Custom Server", "Initialize Next.js 15 App Router in web/. Implement server.ts wrapping http.createServer with Socket.IO support.", "Consolidated server runtime supporting both SSR and WebSockets", "Week 4 (Day 16)"),
        ("Phase 3: Route Handlers", "Unified REST API (app/api/*)", "Migrate Express routes (/api/auth, /tickets, /ingredients, /supplier-orders) to Next.js Route Handlers.", "All HTTP APIs unified; Express server deprecated", "Week 4 (Day 17)"),
        ("Phase 4: Mobile Integration", "Expo Client Re-alignment", "Point mobile API client to Next.js API. Import shared types and Zod models from @kitchenpulse/shared.", "Mobile and Web share exact same validation and client types", "Week 4 (Day 18-19)"),
        ("Phase 5: Optimization & Ship", "Bundle Analysis & Docker", "Run Next.js Bundle Analyzer. Verify RSC reduction. Update docker-compose.yml to run unified web + ai-agent + postgres.", "Production-ready full-stack deployment with reduced bundle footprint", "Week 4 (Day 20)"),
    ]

    for r_idx, row in enumerate(plan_rows, start_r+2):
        arch_sheet.row_dimensions[r_idx].height = 36
        for c_idx, val in enumerate(row, 1):
            cell = arch_sheet.cell(row=r_idx, column=c_idx, value=val)
            cell.font = bold_font if c_idx == 1 else regular_font
            cell.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
            cell.border = box_border
            if r_idx % 2 == 1:
                cell.fill = row_alt_fill

    # Set column widths
    arch_sheet.column_dimensions["A"].width = 24
    arch_sheet.column_dimensions["B"].width = 32
    arch_sheet.column_dimensions["C"].width = 46
    arch_sheet.column_dimensions["D"].width = 38
    arch_sheet.column_dimensions["E"].width = 24

    try:
        wb.save(EXCEL_PATH)
        print("✅ Successfully updated KitchenPluss AI Integration Plan.xlsx with Day 2 Next.js Full-Stack Plan!")
    except PermissionError:
        pending_path = EXCEL_PATH.with_suffix(".pending.xlsx")
        wb.save(pending_path)
        print(f"⚠️ Notice: 'KitchenPluss AI Integration Plan.xlsx' is currently open in Excel.")
        print(f"   Saved staged changes to: {pending_path}")
        print("   Please close Excel and run 'npm run sync:phases' or 'python scripts/update_nextjs_plan.py' to overwrite.")

if __name__ == "__main__":
    update_plan()
