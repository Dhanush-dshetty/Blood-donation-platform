"""
test_generator.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Unit test suite verifying:
1. Monte Carlo Generation Speed Benchmark (< 1.0 second for 50,000 units)
2. Strict Clinical Rules Enforcement (age, weight, blood groups)
3. 42-Day Red Blood Cell (RBC) Shelf-Life Expiry Logic
4. Dynamic Daily Analytics Lifecycle Computations

Author: Aditi Sandikar (NNM23IS006)
"""

import unittest
import time
import pandas as pd
from datetime import datetime

from src.distribution_learner import DistributionLearner
from src.generator import SyntheticGenerator
from src.lifecycle_engine import LifecycleEngine


class TestSyntheticGenerator(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.learner = DistributionLearner("data/sample_real_donors.json")
        cls.generator = SyntheticGenerator(cls.learner)
        cls.lifecycle = LifecycleEngine(cls.generator, initial_pool_size=10000)

    def test_01_speed_benchmark(self):
        """Verifies that 50,000 records are generated in < 1.0 second."""
        t0 = time.time()
        df = self.generator.generate(count=50000)
        elapsed = time.time() - t0

        self.assertEqual(len(df), 50000)
        self.assertLess(elapsed, 1.0, f"Benchmark failed: Took {elapsed:.3f}s for 50k records (must be < 1.0s)")
        print(f"\n[BENCHMARK PASSED] 50,000 records synthesized in {elapsed:.4f}s ({50000/elapsed:,.0f} records/sec)")

    def test_02_clinical_guardrails(self):
        """Verifies clinical bounds for age, weight, and blood groups."""
        df = self.generator.generate(count=10000)

        # 1. Age must be strictly between 18 and 65
        self.assertTrue((df["donor_age"] >= 18).all(), "Found donor age < 18")
        self.assertTrue((df["donor_age"] <= 65).all(), "Found donor age > 65")

        # 2. Weight must be >= 48 kg
        self.assertTrue((df["donor_weight_kg"] >= 48.0).all(), "Found donor weight < 48kg")

        # 3. Blood group must belong to standard 8 groups
        valid_bgs = {"A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"}
        self.assertTrue(set(df["blood_group"].unique()).issubset(valid_bgs), "Invalid blood group found")

        # 4. Storage temperature within reasonable bounds
        self.assertTrue((df["storage_temp_c"] >= 1.0).all())
        self.assertTrue((df["storage_temp_c"] <= 8.0).all())

    def test_03_biological_shelf_life(self):
        """Verifies deterministic shelf-life step function (RBC = 42 days)."""
        df = self.generator.generate(count=5000)
        rbc_units = df[df["component_type"] == "rbc"]

        self.assertGreater(len(rbc_units), 0)
        self.assertTrue((rbc_units["shelf_life_days"] == 42).all(), "RBC shelf life is not strictly 42 days")

        # Verify expiry_date = collection_date + 42 days
        for _, row in rbc_units.head(50).iterrows():
            c_date = datetime.strptime(row["collection_date"], "%Y-%m-%d %H:%M:%S")
            exp_date = datetime.strptime(row["expiry_date"], "%Y-%m-%d %H:%M:%S")
            diff_days = (exp_date - c_date).days
            self.assertEqual(diff_days, 42, f"RBC diff was {diff_days} days instead of 42")

    def test_04_daily_analytics(self):
        """Verifies daily analytics output structure and blood group keys."""
        analytics = self.lifecycle.get_daily_analytics(day_offset=0)

        expected_keys = {
            "targetDate", "dayOffset", "totalSafeUnits",
            "stockByBloodGroup", "collectedToday", "transfusedToday", "expiredToday"
        }
        self.assertTrue(expected_keys.issubset(analytics.keys()), "Missing keys in daily analytics")

        # Verify all 8 blood groups exist in stockByBloodGroup
        valid_bgs = {"A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"}
        self.assertEqual(set(analytics["stockByBloodGroup"].keys()), valid_bgs)

        self.assertGreater(analytics["totalSafeUnits"], 0)
        self.assertGreaterEqual(analytics["collectedToday"], 0)
        self.assertGreaterEqual(analytics["transfusedToday"], 0)
        self.assertGreaterEqual(analytics["expiredToday"], 0)


if __name__ == "__main__":
    unittest.main()
