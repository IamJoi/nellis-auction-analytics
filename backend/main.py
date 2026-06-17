import json
import os
from pathlib import Path

import anthropic
import pandas as pd
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

DATA_PATH = Path(__file__).parent / "data" / "raw" / "auctions.csv"

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

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


def aggregate_all(df: pd.DataFrame) -> dict:
    def group_by(col, key):
        rows = []
        for val, grp in df.groupby(col):
            rows.append({key: val, **metrics_for_group(grp)})
        return sorted(rows, key=lambda r: r["profit"], reverse=True)

    df2 = df.copy()
    df2["month"] = df2["date"].dt.to_period("M").astype(str)

    month_rows = []
    for month, grp in df2.groupby("month"):
        m = metrics_for_group(grp)
        month_rows.append({"month": month, "revenue": m["revenue"],
                           "cost": m["cost"], "profit": m["profit"]})

    revenue = df["total_revenue"].sum()
    cost    = df["total_cost"].sum()
    profit  = df["profit"].sum()

    return {
        "summary": {
            "total_auctions": len(df),
            "total_revenue":  round(revenue, 2),
            "total_cost":     round(cost, 2),
            "total_profit":   round(profit, 2),
            "avg_margin_pct": round(profit / revenue * 100 if revenue else 0, 2),
        },
        "by_category":  group_by("category", "category"),
        "by_program":   group_by("amazon_program", "amazon_program"),
        "by_location":  group_by("location", "location"),
        "by_month":     sorted(month_rows, key=lambda r: r["month"]),
    }


# ─── endpoints ────────────────────────────────────────────────────────────────

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


@app.get("/api/insights")
def insights():
    df = load_df()
    data = aggregate_all(df)

    prompt = (
        "You are a data analyst for Nellis Auction, a liquidation auction company.\n"
        "Analyze this auction performance data and give 5 specific, actionable insights\n"
        "for maximizing profit. Focus on: which Amazon programs to prioritize, which\n"
        "product categories have the best margins, and any patterns worth exploiting.\n"
        "Be direct and specific — dollar amounts and percentages where possible.\n\n"
        f"Data: {json.dumps(data)}"
    )

    try:
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        return {"insights": message.content[0].text}
    except anthropic.APIError as e:
        raise HTTPException(status_code=502, detail=str(e))
