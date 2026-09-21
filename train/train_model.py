"""Huấn luyện Linear Regression dự đoán giá nhà và xuất model.json cho trang web.

Dữ liệu: Ames Housing (Dean De Cock, 2011) qua OpenML, tên "house_prices"
(cùng bộ với cuộc thi Kaggle "House Prices - Advanced Regression Techniques").

Chạy:  python train/train_model.py
"""
import json
from datetime import date
from pathlib import Path

import numpy as np
import sklearn
from sklearn.datasets import fetch_openml
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split

FEATURES = [
    # (tên cột, đơn vị gốc trong dữ liệu)
    ("OverallQual", None),
    ("GrLivArea", "sqft"),
    ("TotalBsmtSF", "sqft"),
    ("GarageCars", None),
    ("YearBuilt", None),
    ("LotArea", "sqft"),
    ("Fireplaces", None),
    ("TotBath", None),
]
SEED = 42

df = fetch_openml(name="house_prices", version=1, as_frame=True, parser="auto").frame

# Tác giả bộ dữ liệu khuyến nghị bỏ các căn > 4000 sqft (ngoại lai, giá bất thường).
df = df[df["GrLivArea"] <= 4000].copy()
# Tổng số phòng tắm: phòng tắm nhỏ (chỉ bồn rửa + toilet) tính 0,5; gồm cả tầng hầm.
df["TotBath"] = df["FullBath"] + 0.5 * df["HalfBath"] + df["BsmtFullBath"] + 0.5 * df["BsmtHalfBath"]

cols = [c for c, _ in FEATURES]
X, y = df[cols].astype(float), df["SalePrice"].astype(float)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=SEED)

model = LinearRegression().fit(X_train, y_train)
pred = model.predict(X_test)
metrics = {
    "r2_test": round(float(r2_score(y_test, pred)), 4),
    "mae_test": round(float(mean_absolute_error(y_test, pred)), 0),
    "rmse_test": round(float(np.sqrt(mean_squared_error(y_test, pred))), 0),
    "n_train": int(len(X_train)),
    "n_test": int(len(X_test)),
}

out = {
    "model": "LinearRegression",
    "target": "SalePrice (USD)",
    "intercept": float(model.intercept_),
    "features": [
        {
            "key": c,
            "coef": float(coef),
            "min": float(X[c].min()),
            "max": float(X[c].max()),
            "median": float(X[c].median()),
            "unit": unit,
        }
        for (c, unit), coef in zip(FEATURES, model.coef_)
    ],
    "metrics": metrics,
    "dataset": {
        "name": "Ames Housing (OpenML: house_prices)",
        "rows_used": int(len(df)),
        "note": "Nhà ở Ames, Iowa (Mỹ), bán 2006-2010, giá USD. Đã bỏ căn có GrLivArea > 4000 sqft.",
    },
    "trained_on": date.today().isoformat(),
    "scikit_learn": sklearn.__version__,
}

path = Path(__file__).resolve().parent.parent / "model.json"
path.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(metrics, indent=2))
print("Đã ghi", path)
