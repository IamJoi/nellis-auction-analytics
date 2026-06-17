import csv
import random
from datetime import date, timedelta
from pathlib import Path

random.seed(42)

LOCATIONS = ["Dean Martin", "North Las Vegas", "Nellis Outlet"]
AMAZON_PROGRAMS = ["Warehouse Deals", "Renewed", "Returns", "Overstock"]
CATEGORIES = ["Electronics", "Home", "Clothing", "Baby", "Beauty", "Sports", "Tools", "Toys"]
CONDITIONS = ["New", "Like New", "Good", "Acceptable"]
ITEM_SIZES = ["Small", "Medium", "Large", "Oversized"]

LABOR_COST_PER_HOUR = 18.50

# Base pallet cost ranges by category
CATEGORY_PALLET_RANGES = {
    "Electronics": (800, 2000),
    "Tools":       (600, 1800),
    "Home":        (300, 900),
    "Sports":      (300, 800),
    "Beauty":      (200, 600),
    "Toys":        (200, 600),
    "Clothing":    (200, 500),
    "Baby":        (200, 500),
}

# Revenue multiplier relative to pallet cost — higher = better margin
CATEGORY_REVENUE_MULT = {
    "Electronics": (1.4, 2.2),
    "Tools":       (1.3, 2.0),
    "Sports":      (1.2, 1.8),
    "Home":        (1.1, 1.7),
    "Beauty":      (1.0, 1.6),
    "Toys":        (1.0, 1.5),
    "Clothing":    (0.9, 1.4),
    "Baby":        (0.9, 1.3),
}

PROGRAM_REVENUE_BOOST = {
    "Renewed":         1.20,
    "Warehouse Deals": 1.20,
    "Overstock":       1.00,
    "Returns":         1.00,
}

CONDITION_REVENUE_MULT = {
    "New":       1.00,
    "Like New":  0.90,
    "Good":      0.75,
    "Acceptable": 0.50,
}

LOCATION_REVENUE_BOOST = {
    "Dean Martin":      1.08,
    "North Las Vegas":  1.00,
    "Nellis Outlet":    1.00,
}

START_DATE = date(2024, 1, 1)
END_DATE   = date(2024, 12, 31)
DATE_RANGE = (END_DATE - START_DATE).days


def random_date():
    return START_DATE + timedelta(days=random.randint(0, DATE_RANGE))


def generate_row(auction_id: int) -> dict:
    location       = random.choice(LOCATIONS)
    amazon_program = random.choice(AMAZON_PROGRAMS)
    category       = random.choice(CATEGORIES)
    condition      = random.choice(CONDITIONS)
    item_size      = random.choice(ITEM_SIZES)

    pallet_lo, pallet_hi = CATEGORY_PALLET_RANGES[category]
    pallet_cost = round(random.uniform(pallet_lo, pallet_hi), 2)

    num_items = random.randint(10, 100)

    # Labor correlated with num_items; oversized gets 1.5× multiplier
    base_labor = 1.0 + (num_items / 100) * 19.0  # 1–20 h range
    base_labor *= random.uniform(0.8, 1.2)        # noise
    if item_size == "Oversized":
        base_labor *= 1.5
    labor_hours = round(min(max(base_labor, 1.0), 20.0), 2)

    # Build revenue from pallet cost × category spread × modifiers × noise
    rev_lo, rev_hi = CATEGORY_REVENUE_MULT[category]
    revenue_mult = random.uniform(rev_lo, rev_hi)
    revenue_mult *= PROGRAM_REVENUE_BOOST[amazon_program]
    revenue_mult *= CONDITION_REVENUE_MULT[condition]
    revenue_mult *= LOCATION_REVENUE_BOOST[location]
    revenue_mult *= random.uniform(0.85, 1.15)  # final noise layer

    total_revenue = round(pallet_cost * revenue_mult, 2)

    return {
        "auction_id":          f"NLS-{auction_id:04d}",
        "date":                random_date().isoformat(),
        "location":            location,
        "amazon_program":      amazon_program,
        "category":            category,
        "condition":           condition,
        "item_size":           item_size,
        "pallet_cost":         pallet_cost,
        "num_items":           num_items,
        "labor_hours":         labor_hours,
        "labor_cost_per_hour": LABOR_COST_PER_HOUR,
        "total_revenue":       total_revenue,
    }


def main():
    rows = [generate_row(i) for i in range(1, 1001)]

    output_path = Path(__file__).parent.parent / "data" / "raw" / "auctions.csv"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    fieldnames = list(rows[0].keys())
    with output_path.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    dates = [r["date"] for r in rows]
    avg_revenue = sum(r["total_revenue"] for r in rows) / len(rows)

    print(f"Rows generated : {len(rows)}")
    print(f"Date range     : {min(dates)} → {max(dates)}")
    print(f"Average revenue: ${avg_revenue:,.2f}")
    print(f"Output         : {output_path}")


if __name__ == "__main__":
    main()
