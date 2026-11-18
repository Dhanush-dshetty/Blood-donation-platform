"""
lifecycle_engine.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Simulates Biological Red Blood Cell (RBC) 42-Day Shelf-Life,
Daily Collection Inflows, Emergency Transfusions, and Auto-Expirations
to power dynamic dashboard charts day-by-day.

Author: Aditi Sandikar (NNM23IS006)
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

try:
    from .generator import SyntheticGenerator
except (ImportError, ValueError):
    from generator import SyntheticGenerator


class LifecycleEngine:
    """
    Manages continuous 42-day blood lifecycle simulation and dynamic day-by-day metrics.
    """

    ALL_BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]

    def __init__(self, generator: Optional[SyntheticGenerator] = None, initial_pool_size: int = 50000):
        if generator is None:
            self.generator = SyntheticGenerator()
        else:
            self.generator = generator

        self.initial_pool_size = initial_pool_size
        self.reference_base_date = datetime.now()
        # Generate initial synthetic inventory pool
        self.inventory_df = self.generator.generate(
            count=self.initial_pool_size,
            reference_date=self.reference_base_date
        )

    def refresh_inventory(self, count: Optional[int] = None):
        """Regenerates the simulation pool."""
        target_count = count or self.initial_pool_size
        self.inventory_df = self.generator.generate(
            count=target_count,
            reference_date=self.reference_base_date
        )

    def get_daily_analytics(self, day_offset: int = 0) -> Dict[str, Any]:
        """
        Calculates dynamic stock levels and daily flow rates for a specific target day.
        
        Args:
            day_offset: Integer offset from baseline date (0 = today, 1 = tomorrow, -1 = yesterday).
            
        Returns:
            Dictionary matching the API specification in the README:
            {
                "targetDate": "YYYY-MM-DD",
                "dayOffset": int,
                "totalSafeUnits": int,
                "stockByBloodGroup": { ... },
                "collectedToday": int,
                "transfusedToday": int,
                "expiredToday": int
            }
        """
        target_dt = self.reference_base_date + timedelta(days=day_offset)
        target_date_str = target_dt.strftime("%Y-%m-%d")

        df = self.inventory_df.copy()
        df["collection_dt"] = pd.to_datetime(df["collection_date"])
        df["expiry_dt"] = pd.to_datetime(df["expiry_date"])

        # 1. Units collected today
        collected_mask = (df["collection_dt"].dt.strftime("%Y-%m-%d") == target_date_str)
        collected_today = int(collected_mask.sum())
        # If pool sample happens to have few on this exact target date, extrapolate stochastic realistic flow
        if collected_today < 20:
            np.random.seed(abs(hash(target_date_str)) % (2**31 - 1))
            collected_today = int(np.random.poisson(lam=320))

        # 2. Units expiring today
        expired_mask = (df["expiry_dt"].dt.strftime("%Y-%m-%d") == target_date_str)
        expired_today = int(expired_mask.sum())
        if expired_today < 5:
            np.random.seed(abs(hash(target_date_str + "_exp")) % (2**31 - 1))
            expired_today = int(np.random.poisson(lam=38))

        # 3. Units transfused today (daily demand outflow)
        np.random.seed(abs(hash(target_date_str + "_trans")) % (2**31 - 1))
        transfused_today = int(np.random.poisson(lam=275))

        # 4. Safe units in active stock on this target date:
        # Condition: collected on or before target_dt AND expiry_dt > target_dt
        valid_mask = (df["collection_dt"] <= target_dt) & (df["expiry_dt"] > target_dt) & (df["status"] != "expired")
        active_df = df[valid_mask]

        stock_counts = active_df["blood_group"].value_counts().to_dict()
        
        # Ensure all 8 blood groups are represented cleanly
        stock_by_bg = {}
        for bg in self.ALL_BLOOD_GROUPS:
            raw_stock = stock_counts.get(bg, 0)
            if raw_stock == 0:
                # Provide baseline synthetic presence proportional to distribution
                proportions = {"O+": 0.35, "B+": 0.30, "A+": 0.22, "AB+": 0.08, "O-": 0.02, "B-": 0.02, "A-": 0.02, "AB-": 0.01}
                raw_stock = int(2800 * proportions[bg])
            stock_by_bg[bg] = int(raw_stock)

        total_safe_units = sum(stock_by_bg.values())

        return {
            "targetDate": target_date_str,
            "dayOffset": int(day_offset),
            "totalSafeUnits": int(total_safe_units),
            "stockByBloodGroup": stock_by_bg,
            "collectedToday": int(collected_today),
            "transfusedToday": int(transfused_today),
            "expiredToday": int(expired_today)
        }
