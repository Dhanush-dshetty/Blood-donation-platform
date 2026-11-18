"""
distribution_learner.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Learns empirical statistical parameters from baseline donor datasets
using Maximum Likelihood Estimation (MLE), truncated Gaussians,
Poisson parameter fitting, and Method-of-Moments Beta distributions.

Author: Aditi Sandikar (NNM23IS006)
"""

import json
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional


class DistributionLearner:
    """
    Learns and holds empirical probability distributions from real donor records.
    Provides robust clinical defaults if input data is sparse or missing.
    """

    # Clinical & Demographic Empirical Priors (Default Indian Blood Banking Demographics)
    DEFAULT_BLOOD_GROUPS = {
        "O+": 0.37, "B+": 0.32, "A+": 0.22, "AB+": 0.07,
        "O-": 0.02, "B-": 0.02, "A-": 0.02, "AB-": 0.005
    }
    DEFAULT_CITIES = {
        "Bangalore": 0.40, "Mangalore": 0.35, "Udupi": 0.15, "Mysore": 0.10
    }
    DEFAULT_GENDERS = {
        "Male": 0.65, "Female": 0.35
    }

    def __init__(self, baseline_path: Optional[str] = None):
        self.params: Dict[str, Any] = {}
        if baseline_path:
            self.fit_from_json(baseline_path)
        else:
            self.use_default_priors()

    def use_default_priors(self):
        """Loads vetted clinical default priors."""
        # Normalize blood group probabilities
        bg_keys = list(self.DEFAULT_BLOOD_GROUPS.keys())
        bg_probs = np.array(list(self.DEFAULT_BLOOD_GROUPS.values()), dtype=float)
        bg_probs = bg_probs / bg_probs.sum()

        city_keys = list(self.DEFAULT_CITIES.keys())
        city_probs = np.array(list(self.DEFAULT_CITIES.values()), dtype=float)
        city_probs = city_probs / city_probs.sum()

        gender_keys = list(self.DEFAULT_GENDERS.keys())
        gender_probs = np.array(list(self.DEFAULT_GENDERS.values()), dtype=float)
        gender_probs = gender_probs / gender_probs.sum()

        self.params = {
            "blood_group": {"categories": bg_keys, "probabilities": bg_probs},
            "city": {"categories": city_keys, "probabilities": city_probs},
            "gender": {"categories": gender_keys, "probabilities": gender_probs},
            "age": {"mean": 29.5, "std": 7.0, "min": 18, "max": 65},
            "weight": {"mean": 66.5, "std": 9.0, "min": 48.0, "max": 110.0},
            "total_donations": {"lambda": 3.8},
            "response_rate": {"alpha": 8.0, "beta": 2.0, "min_bound": 0.40, "max_bound": 1.00}
        }

    def fit_from_json(self, json_path: str):
        """Loads JSON records and fits statistical distributions."""
        try:
            with open(json_path, "r", encoding="utf-8") as f:
                records = json.load(f)
            self.fit(records)
        except Exception as e:
            print(f"[DistributionLearner] Warning: Failed to load {json_path} ({e}). Falling back to priors.")
            self.use_default_priors()

    def fit(self, records: List[Dict[str, Any]]):
        """
        Fits distributions from a list of donor dictionaries:
        - Categorical MLE: P(X=k) = Count(k) / N
        - Truncated Gaussian: sample mean & sample std
        - Poisson lambda: sample mean
        - Beta distribution: Method of Moments on normalized [0, 1] response rate
        """
        if not records or len(records) < 3:
            self.use_default_priors()
            return

        df = pd.DataFrame(records)

        # 1. Blood Group MLE Categorical
        if "bloodGroup" in df.columns:
            counts = df["bloodGroup"].value_counts(normalize=True).to_dict()
            # Ensure all standard 8 groups exist with epsilon smoothing
            all_bgs = list(self.DEFAULT_BLOOD_GROUPS.keys())
            probs = [counts.get(bg, 0.005) for bg in all_bgs]
            probs = np.array(probs) / sum(probs)
            bg_params = {"categories": all_bgs, "probabilities": probs}
        else:
            bg_params = {
                "categories": list(self.DEFAULT_BLOOD_GROUPS.keys()),
                "probabilities": np.array(list(self.DEFAULT_BLOOD_GROUPS.values())) / sum(self.DEFAULT_BLOOD_GROUPS.values())
            }

        # 2. City MLE Categorical
        if "city" in df.columns:
            city_counts = df["city"].value_counts(normalize=True).to_dict()
            cities = list(city_counts.keys())
            city_probs = np.array(list(city_counts.values()))
            city_params = {"categories": cities, "probabilities": city_probs / city_probs.sum()}
        else:
            cities = list(self.DEFAULT_CITIES.keys())
            city_probs = np.array(list(self.DEFAULT_CITIES.values()))
            city_params = {"categories": cities, "probabilities": city_probs / city_probs.sum()}

        # 3. Gender MLE
        if "gender" in df.columns:
            gender_counts = df["gender"].value_counts(normalize=True).to_dict()
            genders = list(gender_counts.keys())
            g_probs = np.array(list(gender_counts.values()))
            gender_params = {"categories": genders, "probabilities": g_probs / g_probs.sum()}
        else:
            genders = list(self.DEFAULT_GENDERS.keys())
            g_probs = np.array(list(self.DEFAULT_GENDERS.values()))
            gender_params = {"categories": genders, "probabilities": g_probs / g_probs.sum()}

        # 4. Age Truncated Gaussian
        if "age" in df.columns and len(df["age"].dropna()) > 0:
            age_mean = float(df["age"].mean())
            age_std = float(df["age"].std()) if df["age"].std() > 0 else 7.0
        else:
            age_mean, age_std = 29.5, 7.0
        age_params = {"mean": age_mean, "std": age_std, "min": 18, "max": 65}

        # 5. Weight Truncated Gaussian
        if "weight" in df.columns and len(df["weight"].dropna()) > 0:
            wt_mean = float(df["weight"].mean())
            wt_std = float(df["weight"].std()) if df["weight"].std() > 0 else 9.0
        else:
            wt_mean, wt_std = 66.5, 9.0
        weight_params = {"mean": wt_mean, "std": wt_std, "min": 48.0, "max": 110.0}

        # 6. Total Donations Poisson
        if "totalDonations" in df.columns and len(df["totalDonations"].dropna()) > 0:
            lambda_val = max(0.5, float(df["totalDonations"].mean()))
        else:
            lambda_val = 3.8
        donation_params = {"lambda": lambda_val}

        # 7. Response Rate Beta Distribution
        if "responseRate" in df.columns and len(df["responseRate"].dropna()) > 0:
            rates = df["responseRate"].astype(float)
            if rates.max() > 1.0:
                rates = rates / 100.0  # normalize 0-100 to 0-1
            rates = rates.clip(0.40, 1.00)
            mean_r = rates.mean()
            var_r = rates.var()
            if var_r > 0 and var_r < mean_r * (1 - mean_r):
                common_term = (mean_r * (1 - mean_r) / var_r) - 1
                alpha_val = max(1.0, mean_r * common_term)
                beta_val = max(1.0, (1 - mean_r) * common_term)
            else:
                alpha_val, beta_val = 8.0, 2.0
        else:
            alpha_val, beta_val = 8.0, 2.0
        response_params = {"alpha": alpha_val, "beta": beta_val, "min_bound": 0.40, "max_bound": 1.00}

        self.params = {
            "blood_group": bg_params,
            "city": city_params,
            "gender": gender_params,
            "age": age_params,
            "weight": weight_params,
            "total_donations": donation_params,
            "response_rate": response_params
        }

    def get_params(self) -> Dict[str, Any]:
        """Returns the dictionary of learned parameters."""
        return self.params
