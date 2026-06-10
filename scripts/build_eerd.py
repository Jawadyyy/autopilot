#!/usr/bin/env python
# Clean EERD for DB Autopilot — rendered with matplotlib (no external binaries).
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Rectangle
from matplotlib.lines import Line2D

OUT_PNG = r"J:\Work\db-autopilot\eerd.png"
OUT_SVG = r"J:\Work\db-autopilot\eerd.svg"

# Group colours (header fill, border)
GROUPS = {
    "core":    ("#DBEAFE", "#2563EB"),   # blue
    "monitor": ("#DCFCE7", "#16A34A"),   # green
    "auto":    ("#EDE9FE", "#7C3AED"),   # purple
    "olap":    ("#FFEDD5", "#EA580C"),   # orange
}
ROW_H = 0.40
HEADER_H = 0.56
W = 3.6              # box width (data units)
FS = 7.2            # attribute font size

# entity: (key) -> dict(title, group, cx, top, attrs=[(name,type,flag)])
# flag: 'pk' | 'fk' | '' ; cx = center x, top = top y
E = {}
def ent(key, title, group, cx, top, attrs):
    E[key] = dict(title=title, group=group, cx=cx, top=top, attrs=attrs)

# ---------------- OLTP (application DB) ----------------
ent("users", "USERS", "core", 15.5, 27.0, [
    ("id","uuid","pk"),("username","varchar",""),("email","varchar",""),
    ("password_hash","text",""),("role","user_role",""),("is_active","bool",""),
    ("last_login_at","timestamptz",""),("created_at","timestamptz",""),
])
ent("conn", "MONITORED_CONNECTIONS", "monitor", 9.0, 24.2, [
    ("id","uuid","pk"),("name","varchar",""),("host","varchar",""),("port","int",""),
    ("db_name","varchar",""),("username","varchar",""),("password_encrypted","text",""),
    ("db_type","db_type",""),("status","conn_status",""),("added_by","uuid","fk"),
    ("last_checked_at","timestamptz",""),("last_error","text",""),("created_at","timestamptz",""),
])
ent("rules", "AUTOPILOT_RULES", "auto", 2.4, 24.2, [
    ("id","uuid","pk"),("name","text",""),("issue_type","text",""),
    ("trigger_condition","text",""),("action_sql_template","text",""),
    ("action_description","text",""),("mode","rule_mode",""),("is_active","bool",""),
    ("created_at","timestamptz",""),
])
ent("issues", "DETECTED_ISSUES", "monitor", 9.0, 17.0, [
    ("id","uuid","pk"),("connection_id","uuid","fk"),("issue_type","text",""),
    ("severity","severity",""),("title","text",""),("description","text",""),
    ("affected_table","text",""),("is_resolved","bool",""),("resolved_by","uuid","fk"),
    ("source","text",""),("fingerprint","text",""),("detected_at","timestamptz",""),
    ("resolved_at","timestamptz",""),
])
ent("actions", "AUTOPILOT_ACTIONS", "auto", 2.4, 16.6, [
    ("id","uuid","pk"),("issue_id","uuid","fk"),("rule_id","uuid","fk"),
    ("action_type","text",""),("sql_applied","text",""),("status","act_status",""),
    ("outcome_notes","text",""),("applied_by","uuid","fk"),("applied_at","timestamptz",""),
])
ent("plans", "QUERY_PLANS", "monitor", 15.6, 17.4, [
    ("id","uuid","pk"),("connection_id","uuid","fk"),("query_hash","text",""),
    ("query_text","text",""),("plan_json","jsonb",""),("plan_type","text",""),
    ("total_cost","numeric",""),("execution_ms","numeric",""),("rows_examined","bigint",""),
    ("related_issue","uuid","fk"),("captured_at","timestamptz",""),
])
ent("backup", "BACKUP_HISTORY", "monitor", 15.6, 23.0, [
    ("id","uuid","pk"),("connection_id","uuid","fk"),("backup_path","text",""),
    ("status","bk_status",""),("size_mb","numeric",""),("wal_lsn","text",""),
    ("error_message","text",""),("started_at","timestamptz",""),("completed_at","timestamptz",""),
])
ent("audit", "AUDIT_LOG", "core", 21.4, 24.4, [
    ("id","uuid","pk"),("table_name","text",""),("operation","text",""),
    ("record_id","text",""),("old_data","jsonb",""),("new_data","jsonb",""),
    ("changed_by","text",""),("changed_at","timestamptz",""),
])

# ---------------- OLAP (warehouse / star schema) ----------------
ent("fact", "FACT_INCIDENTS", "olap", 9.0, 9.3, [
    ("incident_id","bigint","pk"),("source_issue_id","uuid",""),
    ("database_id","int","fk"),("issue_type_id","int","fk"),("time_id","int","fk"),
    ("fix_type_id","int","fk"),("severity_level","int",""),("is_resolved","bit",""),
    ("fix_success","bit",""),("resolution_minutes","int",""),("detected_at","datetime2",""),
])
ent("d_db", "DIM_DATABASE", "olap", 1.8, 6.2, [
    ("database_id","int","pk"),("source_id","uuid",""),("database_name","nvarchar",""),
    ("db_type","nvarchar",""),("host","nvarchar",""),
])
ent("d_it", "DIM_ISSUE_TYPE", "olap", 1.8, 2.0, [
    ("issue_type_id","int","pk"),("issue_category","nvarchar",""),("subcategory","nvarchar",""),
])
ent("d_time", "DIM_TIME", "olap", 16.0, 6.6, [
    ("time_id","int","pk"),("full_date","date",""),("hour_of_day","int",""),
    ("day_of_week","int",""),("month_num","int",""),("quarter_num","int",""),("year_num","int",""),
])
ent("d_fix", "DIM_FIX_TYPE", "olap", 16.0, 2.0, [
    ("fix_type_id","int","pk"),("fix_type_name","nvarchar",""),
])

def box_height(e):
    return HEADER_H + ROW_H * len(e["attrs"])

def anchor(key, side):
    e = E[key]; cx, top = e["cx"], e["top"]; h = box_height(e); midy = top - h/2
    if side == "T": return (cx, top)
    if side == "B": return (cx, top - h)
    if side == "L": return (cx - W/2, midy)
    if side == "R": return (cx + W/2, midy)

fig_w, fig_h = 16.5, 14.5
fig, ax = plt.subplots(figsize=(fig_w, fig_h), dpi=200)
ax.set_xlim(-0.6, 25.0)
ax.set_ylim(-0.4, 29.2)
ax.axis("off")

# zone bands
ax.add_patch(Rectangle((-0.4, 12.4), 25.2, 16.4, facecolor="#F8FAFF", edgecolor="none", zorder=0))
ax.add_patch(Rectangle((-0.4, -0.2), 25.2, 12.2, facecolor="#FFFBF5", edgecolor="none", zorder=0))
ax.text(-0.2, 28.7, "APPLICATION DATABASE  ·  OLTP  (PostgreSQL / Supabase)",
        fontsize=11, fontweight="bold", color="#334155")
ax.text(-0.2, 11.6, "DATA WAREHOUSE  ·  OLAP  (Microsoft SQL Server — Star Schema)",
        fontsize=11, fontweight="bold", color="#9A3412")

def draw_entity(key):
    e = E[key]; fill, brd = GROUPS[e["group"]]
    cx, top = e["cx"], e["top"]; h = box_height(e); left = cx - W/2
    # body
    ax.add_patch(FancyBboxPatch((left, top - h), W, h,
        boxstyle="round,pad=0.02,rounding_size=0.10",
        linewidth=1.3, edgecolor=brd, facecolor="white", zorder=3))
    # header
    ax.add_patch(Rectangle((left, top - HEADER_H), W, HEADER_H, facecolor=fill,
        edgecolor=brd, linewidth=1.3, zorder=4))
    ax.text(cx, top - HEADER_H/2, e["title"], ha="center", va="center",
        fontsize=8.2, fontweight="bold", color="#0F172A", zorder=5)
    # attrs
    y = top - HEADER_H
    for name, typ, flag in e["attrs"]:
        y -= ROW_H
        yc = y + ROW_H/2
        label = name
        weight = "bold" if flag == "pk" else "normal"
        color = "#0F172A" if flag == "pk" else "#334155"
        ax.text(left + 0.16, yc, label, ha="left", va="center", fontsize=FS,
                fontweight=weight, color=color, zorder=5)
        ax.text(left + W - 0.16, yc, typ, ha="right", va="center", fontsize=FS-0.8,
                color="#94A3B8", style="italic", zorder=5)
        if flag == "pk":
            ax.text(cx + 0.05, yc, "PK", ha="center", va="center", fontsize=FS-1.4,
                    color="#2563EB", fontweight="bold", zorder=5)
        elif flag == "fk":
            ax.text(cx + 0.05, yc, "FK", ha="center", va="center", fontsize=FS-1.4,
                    color="#A16207", fontweight="bold", zorder=5)
        # underline PK
        if flag == "pk":
            ax.add_line(Line2D([left+0.16, left+0.16+0.06*len(label)], [yc-0.13, yc-0.13],
                        color="#2563EB", linewidth=0.7, zorder=5))

def manhattan(p1, s1, p2, s2):
    """Return list of points for an orthogonal connector leaving s1, entering s2."""
    x1, y1 = p1; x2, y2 = p2
    pts = [p1]
    if s1 in "LR" and s2 in "LR":
        mx = (x1 + x2) / 2
        pts += [(mx, y1), (mx, y2)]
    elif s1 in "TB" and s2 in "TB":
        my = (y1 + y2) / 2
        pts += [(x1, my), (x2, my)]
    else:  # mixed
        if s1 in "LR":
            pts += [(x2, y1)]
        else:
            pts += [(x1, y2)]
    pts.append(p2)
    return pts

def crow(ax, p, s, many):
    """Draw a small marker at point p on side s. many=True -> crow's foot, else '1' bar."""
    x, y = p
    d = 0.16
    if s == "L": dx, dy = -1, 0
    elif s == "R": dx, dy = 1, 0
    elif s == "T": dx, dy = 0, 1
    else: dx, dy = 0, -1
    bx, by = x + dx*d, y + dy*d
    if many:
        # three prongs
        if s in "LR":
            ax.add_line(Line2D([x, bx],[y, by+0.14], color="#64748B", lw=1.0, zorder=4))
            ax.add_line(Line2D([x, bx],[y, by-0.14], color="#64748B", lw=1.0, zorder=4))
            ax.add_line(Line2D([x, bx],[y, by], color="#64748B", lw=1.0, zorder=4))
        else:
            ax.add_line(Line2D([x, bx+0.14],[y, by], color="#64748B", lw=1.0, zorder=4))
            ax.add_line(Line2D([x, bx-0.14],[y, by], color="#64748B", lw=1.0, zorder=4))
            ax.add_line(Line2D([x, bx],[y, by], color="#64748B", lw=1.0, zorder=4))
    else:
        # short perpendicular bar ("one")
        if s in "LR":
            ax.add_line(Line2D([bx, bx],[by-0.12, by+0.12], color="#64748B", lw=1.2, zorder=4))
        else:
            ax.add_line(Line2D([bx-0.12, bx+0.12],[by, by], color="#64748B", lw=1.2, zorder=4))

# edges: (one_side_key, one_side, many_key, many_side, label, dashed)
EDGES = [
    ("users","L","conn","T","adds",False),
    ("users","B","issues","R","resolves",False),
    ("users","L","actions","T","performs",False),
    ("conn","B","issues","T","has",False),
    ("conn","R","backup","L","backs up",False),
    ("conn","B","plans","T","captures",False),
    ("issues","L","actions","R","triggers",False),
    ("rules","B","actions","T","governs",False),
    ("issues","R","plans","L","explains",False),
    ("issues","B","fact","T","ETL load",True),
    ("d_db","R","fact","L","dimension",False),
    ("d_it","R","fact","L","dimension",False),
    ("d_time","L","fact","R","dimension",False),
    ("d_fix","L","fact","R","dimension",False),
]

for ok, os_, mk, ms, label, dashed in EDGES:
    p1 = anchor(ok, os_); p2 = anchor(mk, ms)
    pts = manhattan(p1, os_, p2, ms)
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    ax.add_line(Line2D(xs, ys, color="#94A3B8" if not dashed else "#EA580C",
                lw=1.1, linestyle="--" if dashed else "-", zorder=2))
    crow(ax, p1, os_, many=False)   # "one" end
    crow(ax, p2, ms, many=True)     # "many" end
    # label near midpoint
    mid = pts[len(pts)//2]
    ax.text(mid[0], mid[1]+0.12, label, ha="center", va="bottom", fontsize=6.6,
            color="#EA580C" if dashed else "#475569", style="italic", zorder=6,
            bbox=dict(boxstyle="round,pad=0.12", fc="white", ec="none", alpha=0.85))

for key in E:
    draw_entity(key)

# legend
leg = [("Core", GROUPS["core"]), ("Monitoring", GROUPS["monitor"]),
       ("Autopilot", GROUPS["auto"]), ("Analytics / OLAP", GROUPS["olap"])]
lx = 0.0
for name,(fill,brd) in leg:
    ax.add_patch(Rectangle((lx, 28.95), 0.55, 0.28, facecolor=fill, edgecolor=brd, lw=1.0, zorder=6))
    ax.text(lx+0.7, 29.09, name, ha="left", va="center", fontsize=8, color="#334155", zorder=6)
    lx += 0.7 + 0.13*len(name) + 1.0

ax.text(24.8, -0.2, "DB Autopilot — Enhanced Entity-Relationship Diagram", ha="right",
        va="bottom", fontsize=8, color="#94A3B8", style="italic")

plt.subplots_adjust(left=0.01, right=0.99, top=0.99, bottom=0.01)
fig.savefig(OUT_PNG, dpi=200, bbox_inches="tight", facecolor="white")
fig.savefig(OUT_SVG, bbox_inches="tight", facecolor="white")
print("WROTE", OUT_PNG)
print("WROTE", OUT_SVG)
