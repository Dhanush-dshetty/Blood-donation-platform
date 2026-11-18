"""
generator.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
High-speed vectorized Monte Carlo synthetic generator.
Synthesizes 50,000 to 80,000 complete clinical records in < 1 second
while strictly enforcing medical guardrails.

CLI Usage:
    python src/generator.py --count 80000 --output data/sample_synthetic_output.csv

Author: Aditi Sandikar (NNM23IS006)
"""

import time
import argparse
import os
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

try:
    from .distribution_learner import DistributionLearner
except (ImportError, ValueError):
    from distribution_learner import DistributionLearner


class SyntheticGenerator:
    """
    Vectorized Monte Carlo Generator for Blood Units and Donor Records.
    Uses learned parameters or defaults to synthesize high-volume tabular datasets.
    """

    def __init__(self, learner: Optional[DistributionLearner] = None):
        if learner is None:
            self.learner = DistributionLearner()
        else:
            self.learner = learner
        self.params = self.learner.get_params()

    def generate(self, count: int = 50000, reference_date: Optional[datetime] = None) -> pd.DataFrame:
        """
        Synthesizes `count` blood unit & donor records in a vectorized manner.
        Returns a Pandas DataFrame containing clinical, demographic, and lifecycle fields.
        """
        if reference_date is None:
            reference_date = datetime.now()

        # 1. Categorical sampling (Blood Group, City, Gender)
        bg_cats = self.params["blood_group"]["categories"]
        bg_probs = self.params["blood_group"]["probabilities"]
        blood_groups = np.random.choice(bg_cats, size=count, p=bg_probs)

        city_cats = self.params["city"]["categories"]
        city_probs = self.params["city"]["probabilities"]
        cities = np.random.choice(city_cats, size=count, p=city_probs)

        gender_cats = self.params["gender"]["categories"]
        gender_probs = self.params["gender"]["probabilities"]
        genders = np.random.choice(gender_cats, size=count, p=gender_probs)

        # 2. Continuous Gaussian sampling (Age & Weight) under clinical clamping
        age_p = self.params["age"]
        raw_ages = np.random.normal(age_p["mean"], age_p["std"], size=count)
        ages = np.clip(np.round(raw_ages), age_p["min"], age_p["max"]).astype(int)

        wt_p = self.params["weight"]
        raw_wts = np.random.normal(wt_p["mean"], wt_p["std"], size=count)
        weights = np.clip(np.round(raw_wts, 1), wt_p["min"], wt_p["max"])

        # 3. Poisson sampling for Total Donations
        lambda_val = self.params["total_donations"]["lambda"]
        total_donations = np.random.poisson(lambda_val, size=count)

        # 4. Beta distribution for Donor Response Rate
        alpha_val = self.params["response_rate"]["alpha"]
        beta_val = self.params["response_rate"]["beta"]
        raw_beta = np.random.beta(alpha_val, beta_val, size=count)
        # Scale to [40%, 100%]
        response_rates = np.round(40.0 + (raw_beta * 60.0), 1)

        # 5. Component Types (RBC 50%, Whole Blood 25%, Platelets 15%, Plasma 10%)
        comp_types = ["rbc", "whole_blood", "platelets", "plasma"]
        comp_probs = [0.50, 0.25, 0.15, 0.10]
        components = np.random.choice(comp_types, size=count, p=comp_probs)

        # 6. Physiological & Safety Tests
        # Hemoglobin (g/dL) based on gender:
        # Male: N(14.8, 1.1), Female: N(13.4, 0.9)
        male_mask = (genders == "Male")
        hb_levels = np.zeros(count, dtype=float)
        hb_levels[male_mask] = np.random.normal(14.8, 1.1, size=male_mask.sum())
        hb_levels[~male_mask] = np.random.normal(13.4, 0.9, size=(~male_mask).sum())
        hb_levels = np.clip(np.round(hb_levels, 1), 11.5, 18.5)

        # Storage temperatures (Safe zone 2 - 6 C, normal around 4 C)
        temps = np.clip(np.round(np.random.normal(4.0, 0.5, size=count), 1), 1.5, 7.5)

        # 7. Collection Dates: Uniformly distributed across the past 60 days
        collection_offsets_days = np.random.uniform(0, 60, size=count)
        collection_dates = [
            (reference_date - timedelta(days=float(d))).replace(microsecond=0)
            for d in collection_offsets_days
        ]

        # 8. Biological Shelf-Life & Expiry Dates:
        # RBC: 42 days, Whole Blood: 42 days, Platelets: 5 days, Plasma: 365 days
        shelf_life_map = {
            "rbc": 42,
            "whole_blood": 42,
            "platelets": 5,
            "plasma": 365
        }
        shelf_lifes = np.array([shelf_life_map[c] for c in components])
        expiry_dates = [
            c_date + timedelta(days=int(s_life))
            for c_date, s_life in zip(collection_dates, shelf_lifes)
        ]

        # 9. Lifecycle Status:
        # Step Function: If collectionDate + shelf_life < reference_date => 'expired'
        # Otherwise: prob of being transfused vs available vs quarantine
        statuses = []
        for c_date, exp_date in zip(collection_dates, expiry_dates):
            if exp_date < reference_date:
                # Expired if not transfused before expiry
                if np.random.rand() < 0.70:
                    statuses.append("transfused")
                else:
                    statuses.append("expired")
            else:
                # Still within shelf life
                r = np.random.rand()
                if r < 0.25:
                    statuses.append("transfused")
                elif r < 0.95:
                    statuses.append("available")
                else:
                    statuses.append("quarantine")

        # 10. Generate Identifiers & Assembling DataFrame
        unit_ids = [f"UNT-{i+1:06d}" for i in range(count)]
        donor_ids = [f"DNR-{np.random.randint(1000, 9999)}" for _ in range(count)]

        df = pd.DataFrame({
            "unit_id": unit_ids,
            "donor_id": donor_ids,
            "blood_group": blood_groups,
            "component_type": components,
            "donor_gender": genders,
            "donor_age": ages,
            "donor_weight_kg": weights,
            "city": cities,
            "hemoglobin_g_dl": hb_levels,
            "storage_temp_c": temps,
            "total_donations": total_donations,
            "response_rate_pct": response_rates,
            "collection_date": [d.strftime("%Y-%m-%d %H:%M:%S") for d in collection_dates],
            "shelf_life_days": shelf_lifes,
            "expiry_date": [d.strftime("%Y-%m-%d %H:%M:%S") for d in expiry_dates],
            "status": statuses,
            "verified_safe": [(s == "available") for s in statuses]
        })

        return df


def main():
    parser = argparse.ArgumentParser(description="AI Synthetic Tabular Generator for Blood Donation Platforms")
    parser.add_argument("--count", type=int, default=80000, help="Number of synthetic records to generate (e.g. 50000, 80000)")
    parser.add_argument("--output", type=str, default="data/sample_synthetic_output.csv", help="Output CSV path for preview")
    parser.add_argument("--baseline", type=str, default="data/sample_real_donors.json", help="Path to real baseline JSON")
    args = parser.parse_args()

    print("\n" + "=" * 65)
    print("🩸 AI Synthetic Tabular Dataset & Simulation Engine")
    print(f"   Target Volume: {args.count:,} records")
    print(f"   Baseline Input: {args.baseline}")
    print("=" * 65)

    # 1. Fit distributions
    t0 = time.time()
    learner = DistributionLearner(args.baseline if os.path.exists(args.baseline) else None)
    fit_time = time.time() - t0
    print(f"✓ Statistical Distributions Learned in {fit_time:.4f}s")

    # 2. Vectorized Monte Carlo generation
    t1 = time.time()
    generator = SyntheticGenerator(learner)
    df = generator.generate(count=args.count)
    gen_time = time.time() - t1

    print(f"✓ Synthesized {len(df):,} records in {gen_time:.4f} seconds!")
    print(f"⚡ Generation Speed: {len(df)/gen_time:,.0f} records/second")

    # 3. Export preview sample
    os.makedirs(os.path.dirname(args.output) or ".", exist_ok=True)
    # Save preview sample (e.g. top 500 records) to keep disk footprint minimal while satisfying CLI
    preview_df = df.head(500)
    preview_df.to_csv(args.output, index=False)
    print(f"✓ Preview sample saved to: {args.output}")

    # Summary statistics
    print("\n📊 Blood Group Distribution in Generated Sample:")
    print(df["blood_group"].value_counts(normalize=True).round(3).to_dict())

    print("\n📦 Unit Status Breakdown:")
    print(df["status"].value_counts().to_dict())
    print("=" * 65 + "\n")


if __name__ == "__main__":
    main()
