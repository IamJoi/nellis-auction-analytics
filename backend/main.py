import json
import os
import re
from pathlib import Path

import anthropic
import pandas as pd
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

DATA_PATH = Path(__file__).parent / "data" / "raw" / "auctions.csv"
client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

SYSTEM_PROMPT = (
    "You are a retail analytics advisor for Nellis Auction, a liquidation auction "
    "company in Las Vegas. You analyze Amazon return pallet auction data to maximize "
    "profit. Be specific, direct, and actionable. Always reference actual numbers "
    "from the data."
)

app = FastAPI(title="Nellis Auction Analytics")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


# ─── data helpers ─────────────────────────────────────────────────────────────

def load_df() -> pd.DataFrame:
    df = pd.read_csv(DATA_PATH, parse_dates=["date"])
    df["labor_cost"] = df["labor_hours"] * df["labor_cost_per_hour"]
    df["total_cost"] = df["pallet_cost"] + df["labor_cost"]
    df["profit"] = df["total_revenue"] - df["total_cost"]
    df["margin"] = df["profit"] / df["total_revenue"] * 100
    return df


def metrics_for_group(group: pd.DataFrame) -> dict:
    revenue = group["total_revenue"].sum()
    cost    = group["total_cost"].sum()
    profit  = group["profit"].sum()
    margin  = profit / revenue * 100 if revenue else 0.0
    return {
        "revenue": round(revenue, 2),
        "cost":    round(cost, 2),
        "profit":  round(profit, 2),
        "margin":  round(margin, 2),
    }


def build_rich_context(df: pd.DataFrame) -> dict:
    # Categories sorted by margin %
    cat_rows = []
    for cat, grp in df.groupby("category"):
        cat_rows.append({"category": cat, **metrics_for_group(grp)})
    cat_rows.sort(key=lambda r: r["margin"], reverse=True)

    # Programs sorted by profit
    prog_rows = []
    for prog, grp in df.groupby("amazon_program"):
        prog_rows.append({"amazon_program": prog, **metrics_for_group(grp)})
    prog_rows.sort(key=lambda r: r["profit"], reverse=True)

    # Locations sorted by profit
    loc_rows = []
    for loc, grp in df.groupby("location"):
        loc_rows.append({"location": loc, **metrics_for_group(grp)})
    loc_rows.sort(key=lambda r: r["profit"], reverse=True)

    # Month-over-month trend
    df2 = df.copy()
    df2["month"] = df2["date"].dt.to_period("M").astype(str)
    month_rows = []
    for month, grp in df2.groupby("month"):
        m = metrics_for_group(grp)
        month_rows.append({"month": month, "revenue": m["revenue"], "profit": m["profit"]})
    month_rows.sort(key=lambda r: r["month"])

    if len(month_rows) >= 6:
        recent = sum(r["revenue"] for r in month_rows[-3:])
        prior  = sum(r["revenue"] for r in month_rows[-6:-3])
        delta  = (recent - prior) / prior * 100 if prior else 0.0
        mom_trend = {
            "direction":           "growing" if delta > 0 else "declining",
            "pct_change":          round(delta, 1),
            "recent_3m_revenue":   round(recent, 2),
            "prior_3m_revenue":    round(prior, 2),
        }
    else:
        mom_trend = {"direction": "insufficient_data"}

    # Program + category combos sorted by margin
    combo_rows = []
    for (prog, cat), grp in df.groupby(["amazon_program", "category"]):
        m = metrics_for_group(grp)
        combo_rows.append({"program": prog, "category": cat, **m})
    combo_rows.sort(key=lambda r: r["margin"], reverse=True)

    return {
        "top3_categories_by_margin":    cat_rows[:3],
        "bottom3_categories_by_margin": cat_rows[-3:],
        "best_program":                 prog_rows[0] if prog_rows else None,
        "worst_program":                prog_rows[-1] if prog_rows else None,
        "all_programs":                 prog_rows,
        "best_location":                loc_rows[0] if loc_rows else None,
        "all_locations":                loc_rows,
        "mom_trend":                    mom_trend,
        "monthly_data":                 month_rows,
        "top5_combos_by_margin":        combo_rows[:5],
        "bottom5_combos_by_margin":     combo_rows[-5:],
    }


def call_claude(user: str, max_tokens: int = 1200) -> str:
    try:
        msg = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=max_tokens,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user}],
        )
        return msg.content[0].text
    except anthropic.APIError as e:
        raise HTTPException(status_code=502, detail=str(e))


# ─── chart endpoints ───────────────────────────────────────────────────────────

@app.get("/api/summary")
def summary():
    df = load_df()
    revenue = df["total_revenue"].sum()
    cost    = df["total_cost"].sum()
    profit  = df["profit"].sum()
    return {
        "total_auctions": len(df),
        "total_revenue":  round(revenue, 2),
        "total_cost":     round(cost, 2),
        "total_profit":   round(profit, 2),
        "avg_margin_pct": round(profit / revenue * 100 if revenue else 0, 2),
    }


@app.get("/api/by-category")
def by_category():
    df = load_df()
    rows = []
    for category, group in df.groupby("category"):
        rows.append({"category": category, **metrics_for_group(group)})
    return sorted(rows, key=lambda r: r["profit"], reverse=True)


@app.get("/api/by-program")
def by_program():
    df = load_df()
    rows = []
    for program, group in df.groupby("amazon_program"):
        rows.append({"amazon_program": program, **metrics_for_group(group)})
    return sorted(rows, key=lambda r: r["profit"], reverse=True)


@app.get("/api/by-location")
def by_location():
    df = load_df()
    rows = []
    for location, group in df.groupby("location"):
        rows.append({"location": location, **metrics_for_group(group)})
    return sorted(rows, key=lambda r: r["profit"], reverse=True)


@app.get("/api/by-month")
def by_month():
    df = load_df()
    df["month"] = df["date"].dt.to_period("M").astype(str)
    rows = []
    for month, group in df.groupby("month"):
        m = metrics_for_group(group)
        rows.append({"month": month, "revenue": m["revenue"],
                     "cost": m["cost"], "profit": m["profit"]})
    return sorted(rows, key=lambda r: r["month"])


# ─── insights endpoints ────────────────────────────────────────────────────────

@app.get("/api/insights")
def insights():
    df  = load_df()
    ctx = build_rich_context(df)
    prompt = (
        "Based on this auction performance data, give me:\n"
        "1. TOP 3 IMMEDIATE ACTIONS — what to do this week to increase profit\n"
        "2. BEST PRODUCT MIX — which category + Amazon program combinations to prioritize\n"
        "3. AVOID LIST — what to stop buying or deprioritize and why\n"
        "4. CAMPAIGN IDEA — one specific promotion or auction strategy to test next month\n"
        "5. LOCATION INSIGHT — how to optimize across the three warehouse locations\n\n"
        f"Data: {json.dumps(ctx)}"
    )
    return {"insights": call_claude(prompt, max_tokens=1500)}


@app.get("/api/insights/buying-guide")
def insights_buying_guide():
    df = load_df()
    combo_rows = []
    for (prog, cat), grp in df.groupby(["amazon_program", "category"]):
        m = metrics_for_group(grp)
        combo_rows.append({"program": prog, "category": cat, **m})
    combo_rows.sort(key=lambda r: r["margin"], reverse=True)

    prompt = (
        "Based on the margin performance of every Amazon program + product category "
        "combination, give me a ranked buying guide. For each top recommendation state: "
        "expected margin %, why it outperforms, and the pallet cost range to target. "
        "Also call out the 3 combos to avoid entirely. Format as a clear ranked list "
        "with a BUY section and an AVOID section.\n\n"
        f"All combinations sorted by margin %: {json.dumps(combo_rows)}"
    )
    return {"insights": call_claude(prompt, max_tokens=1200)}


@app.get("/api/insights/weekly-focus")
def insights_weekly_focus():
    df  = load_df()
    ctx = build_rich_context(df)
    prompt = (
        "Give the Nellis operations team a focused 3-bullet action plan for this week "
        "only. Each bullet must be one specific action, name who should execute it, and "
        "state the expected impact in dollars or percentage points. No background, no "
        "fluff — just the 3 highest-leverage moves available right now.\n\n"
        f"Data: {json.dumps(ctx)}"
    )
    return {"insights": call_claude(prompt, max_tokens=600)}


@app.get("/api/insights/executive")
def insights_executive():
    df  = load_df()
    ctx = build_rich_context(df)
    prompt = (
        "You are analyzing Amazon return pallet auction data for a non-technical executive. "
        "Generate exactly 3 to 5 specific, immediately actionable business recommendations. "
        "Each must cite real numbers from the data and name a concrete next step.\n\n"
        "Respond with ONLY valid JSON — no prose, no code fences — in this exact shape:\n"
        '{"recommendations": [{"icon": "<single emoji>", "title": "<5-8 word action headline>", '
        '"description": "<2-3 sentences, specific numbers, clear action>"}]}\n\n'
        f"Data: {json.dumps(ctx)}"
    )
    try:
        msg = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1500,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = msg.content[0].text.strip()
        # Strip accidental code fences
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=502, detail=f"Claude returned non-JSON: {exc}")
    except anthropic.APIError as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@app.get("/api/insights/executive")
def insights_executive():
    df  = load_df()
    ctx = build_rich_context(df)
    prompt = (
        "Based on this auction data, return a JSON array of exactly 5 executive recommendations.\n"
        "Each element must be a JSON object with exactly these three fields:\n"
        "  \"icon\"        — one relevant emoji\n"
        "  \"title\"       — action-oriented title in 4-7 words, ALL CAPS\n"
        "  \"description\" — 2-3 sentences with specific dollar amounts and percentages\n\n"
        "Return ONLY the raw JSON array. No markdown fences, no explanation, no other text.\n\n"
        f"Data: {json.dumps(ctx)}"
    )
    text = call_claude(prompt, max_tokens=900)
    try:
        match = re.search(r'\[[\s\S]*\]', text)
        recs  = json.loads(match.group() if match else text)
        return {"recommendations": recs}
    except (json.JSONDecodeError, AttributeError) as e:
        raise HTTPException(status_code=500, detail=f"Claude returned non-JSON: {e} — raw: {text[:200]}")


@app.get("/api/insights/risk-flags")
def insights_risk_flags():
    df  = load_df()
    ctx = build_rich_context(df)
    combo_rows = []
    for (prog, cat), grp in df.groupby(["amazon_program", "category"]):
        m = metrics_for_group(grp)
        combo_rows.append({"program": prog, "category": cat, **m})
    combo_rows.sort(key=lambda r: r["margin"])  # worst first

    prompt = (
        "Audit this auction data for financial risk. Flag:\n"
        "- Categories actively losing money (negative margin) and the exact dollar loss\n"
        "- Amazon programs dragging down overall profit\n"
        "- Locations underperforming vs the best location, with the gap in dollars\n"
        "- The 5 worst program + category combinations and what they're costing per year\n"
        "- Any systemic pattern suggesting a sourcing or pricing problem\n"
        "Be blunt. Use dollar amounts throughout.\n\n"
        f"Performance data: {json.dumps(ctx)}\n"
        f"Worst 10 combinations: {json.dumps(combo_rows[:10])}"
    )
    return {"insights": call_claude(prompt, max_tokens=1200)}
