---
name: "grounded-research-benchmark"
description: "Perform triangulated cognitive research combining SQLite memory, GitHub 10k+ stars patterns, and ToT DAG benchmarking before critical architectural decisions. Automatically triggers subagent research escalation when confidence is low (<0.70). Keywords: research, benchmark, github, memory, triangulation, grounding, best-practices, escalation"
---
# Grounded Research & Cognitive Benchmark Skill

## 1. Overview & Philosophy
Khi đối mặt với một bài toán kiến trúc mới, công nghệ lạ, hoặc khi độ tin cậy thấp, Agent **KHÔNG ĐƯỢC PHÉP ĐOÁN MÒ (Zero Guesswork / Zero Hallucination)**.
Skill này quy chuẩn hóa quy trình **Cognitive Triangulation**:
$$\text{Kiến Trúc Tối Ưu} = \mathcal{F}(\text{Kinh Nghiệm Nội Bộ SQLite},\ \text{Mẫu Chuẩn GitHub 10k+},\ \text{Ràng Buộc Thực Tế Của Dự Án})$$

---

## 2. Trigger Conditions
Kích hoạt skill này khi:
1. Thiết kế hoặc thay đổi kiến trúc quan trọng (Database schema, State Machine, Caching, IPC, Subagents).
2. Tác vụ có độ bất định cao (Confidence Score < 0.70).
3. Đã thử sửa lỗi 2 lần liên tiếp (`failureStreak >= 2`) nhưng test vẫn thất bại.
4. Tích hợp thư viện mới chưa có trong codebase hiện tại.

---

## 3. Mandatory 5-Phase Execution Protocol

### Phase 1: Internal Memory Recall (Đọc SQLite không tràn context)
1. Gọi `kilo_memory_report` hoặc đọc các gợi ý tại Gate 1 để lấy danh sách:
   - Các `memory_facts` đang có hiệu lực.
   - Các bài học kinh nghiệm (`learning_reflections`) của các session trước.
2. Trích xuất các cạm bẫy đã được ghi nhận (`wrongPathsEncountered`) để không lặp lại.

### Phase 2: External Grounding & Low-Confidence Escalation
1. **Đánh giá sơ bộ độ tin cậy (Confidence Evaluation):**
   - Nếu chưa nắm rõ thư viện / API, **BẮT BUỘC kích hoạt Research Subagent (`invoke_subagent` với role `research`)**.
   - Subagent tra cứu GitHub (Repo 10k+ stars), tài liệu `llms.txt`, và AST Signatures trong sandbox riêng.
   - Trả về bản tóm tắt tinh hoa (< 500 tokens) cho Agent chính, tránh làm nổ context window.

### Phase 3: Cognitive Triangulation & Atomic Persistence (Gate 2)
1. Gọi `kilo_triangulate_research` với:
   - `internalMemoryLearned`: Bài học cũ từ SQLite.
   - `externalGroundingPatterns`: Mẫu thiết kế chuẩn từ GitHub.
   - `dagOptions`: So sánh cụ thể ít nhất 2-3 phương án:
     - **Option A:** Cách cũ trong DB (hoặc giữ nguyên hiện trạng).
     - **Option B:** Porting nguyên mẫu từ GitHub.
     - **Option C:** Tích hợp tinh hoa (Triangulated Synthesis) tối ưu cho dự án.
   - `chosenOption`: Phương án được chọn kèm lý do.
   - `confidenceScore`: Điểm tin cậy [0.0 - 1.0]. Nếu < 0.70, tool tự động kích hoạt cờ cảnh báo Research Escalation.
2. Gọi `kilo_grill_plan` để phản biện rủi ro Adversarial Red-Team (Inversion, Simplification, Blast Radius).
3. Gọi `kilo_benchmark_solution` để so khớp với chuẩn công nghiệp.

### Phase 4: Grounded Surgical Implementation (Gate 4)
1. Áp dụng `problem-solving/defense-in-depth` (Validation ở 3 tầng: Input, Logic, State/Persistence).
2. Giữ nguyên tắc `engineering/clean-code` (Không wrapper rác, không log debug thừa thãi).
3. Kiểm chứng thực nghiệm bằng test suite và Playwright E2E.

### Phase 5: Self-Evolution & Skill Synthesis (Gate 5)
1. Gọi `kilo_record_reflection` để lưu bài học thành công và cạm bẫy đã tránh vào SQLite.
2. Gọi `kilo_remember_fact` để ghim quy tắc kiến trúc mới vào `memory_facts`.
3. Nếu phát hiện một giải pháp kiến trúc có giá trị tái sử dụng cao, gọi `kilo_synthesize_skill` để tự sinh `SKILL.md` mới.

---

## 4. Fallback & Guardrails Matrix
- **Offline / Air-gapped Fallback:** Khi không có kết nối internet, chuyển sang tra cứu **Local Repomix AST Map + 178 kỹ năng có sẵn trong Kilo-Kit**.
- **Loop Circuit Breaker:** Nếu cùng một file bị sửa đổi 3 lần liên tiếp mà test vẫn không pass, ngắt mạch và gọi `kilo_trace_root_cause` 5-Whys.
