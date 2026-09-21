# Ước tính giá nhà bằng Linear Regression

Trang web nhỏ cho người dùng nhập thông tin căn nhà và nhận mức giá tham khảo từ một mô hình **Linear Regression**.

- **Web (chạy thật):** https://tuananhnguyen0103.github.io/house-price-linear-regression/
- **Mã nguồn:** https://github.com/tuananhnguyen0103/house-price-linear-regression

## Mô hình chạy ở đâu?

Trang được host bằng **GitHub Pages**. GitHub Pages chỉ phục vụ file tĩnh, không chạy code phía máy chủ. Với Linear Regression, việc dự đoán chỉ là một phép cộng:

```text
giá = hệ số chặn + Σ (giá trị đặc trưng × hệ số)
```

Vì vậy các hệ số được huấn luyện bằng scikit-learn, lưu vào [`model.json`](model.json), và trình duyệt của người dùng tính trực tiếp. Kết quả trùng khớp với `predict()` của scikit-learn (đã đối chiếu, lệch dưới 0,5 USD do làm tròn). Không cần máy chủ, không cần Docker.

## Dữ liệu và mô hình

- Dữ liệu: **Ames Housing** (Dean De Cock, 2011), lấy qua OpenML với tên `house_prices`, cùng bộ với cuộc thi Kaggle *House Prices - Advanced Regression Techniques*. Đây là nhà ở Ames, Iowa (Mỹ), bán năm 2006-2010, giá tính bằng **USD**.
- Đã bỏ 4 căn có diện tích sử dụng trên 4000 sqft (ngoại lai, theo khuyến nghị của tác giả bộ dữ liệu), còn 1.456 căn. Chia 80% huấn luyện, 20% kiểm tra (`random_state=42`).
- 8 đặc trưng: chất lượng tổng thể, năm xây dựng, diện tích sử dụng, diện tích tầng hầm, diện tích lô đất, sức chứa ga-ra, tổng số phòng tắm, số lò sưởi. Trang nhận diện tích bằng m² và tự đổi sang sqft.
- Kết quả trên tập kiểm tra (292 căn): **R² = 0,829**, **MAE ≈ 23.140 USD**, RMSE ≈ 29.960 USD.
- Không đưa số phòng ngủ và số phòng tắm riêng lẻ vào mô hình: khi đã có diện tích, hệ số của chúng bị **âm** (nhiều phòng hơn trên cùng diện tích thì phòng nhỏ hơn), người dùng sẽ khó hiểu. Đây là một ví dụ về đa cộng tuyến.

## Hạn chế

- Chỉ mang tính minh hoạ học thuật, không dùng để định giá thực tế. Giá là USD tại Iowa, không phản ánh thị trường Việt Nam.
- Mô hình tuyến tính có thể cho giá trị không hợp lệ (≤ 0) với tổ hợp cực đoan, trang sẽ báo khi đó. Nhập giá trị ngoài khoảng dữ liệu huấn luyện cũng sẽ có cảnh báo.

## Chạy trên máy

Cần một máy chủ web tĩnh (mở trực tiếp file bằng `file://` sẽ không tải được `model.json`):

```bash
python -m http.server 8000
# mở http://localhost:8000
```

## Huấn luyện lại

```bash
pip install -r train/requirements.txt
python train/train_model.py     # ghi lại model.json
```

## Cấu trúc

```text
index.html, style.css, app.js   # giao diện và phép tính trên trình duyệt
model.json                      # hệ số, khoảng giá trị, chỉ số đánh giá
train/train_model.py            # tải dữ liệu, huấn luyện, xuất model.json
train/requirements.txt          # phiên bản thư viện đã dùng
```
