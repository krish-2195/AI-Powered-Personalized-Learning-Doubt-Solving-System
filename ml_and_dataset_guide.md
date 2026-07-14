# AI Learn Platform - ML Pipeline & Datasets Guide

The Machine Learning backbone of the AI Learn platform is responsible for continuously assessing a student's actual mastery of a topic. This guide breaks down exactly how the data was gathered, how the model is trained, and how it updates itself over time.

---

## 1. The Datasets

Because this is a new platform, it suffers from the **Cold Start Problem**—there are no real students using it yet, so there is no real data to train a model on. To solve this, the project relies on heavily engineered **Synthetic Data**.

### `ai_learn_performance_dataset.csv` (The Core Synthetic Dataset)
This file contains approximately 4,000 rows of simulated student interactions. 
**How is it generated?** (via `ml/training/generate_synthetic_dataset.py`)
1. **Latent Traits**: The script generates 600 fake students. It randomly assigns them a hidden `ability` score (how smart they are) and an `engagement` score (how hard they try). 
2. **Simulation**: It simulates these students taking quizzes. For example, a student with high ability but low engagement might score well but rarely watch recommended videos. A student with low ability but high engagement might score poorly at first, but ask the AI chatbot a lot of questions.
3. **The Knowledge Graph Factor**: The script looks at the `topic_relationships.csv`. If a topic is deep in the prerequisite chain (like *Polymorphism*), the script artificially lowers the student's expected performance, simulating that harder topics take longer to master.
4. **The Target Label**: The script calculates a hidden `composite score` blending their accuracy, mastery, and speed. Based on this, it assigns the final label: **Weak**, **Moderate**, or **Strong**.

### `real_student_dataset.csv`
This is an empty (or very small) dataset that grows over time. As real students use the frontend, their actual quiz results and times are appended here.

---

## 2. The Machine Learning Model

The platform uses a **Random Forest Classifier** (`RandomForestClassifier` from `scikit-learn`).

### Why Random Forest?
Deep Learning (Neural Networks) requires tens of thousands of rows of data to be effective; on a 4,000-row tabular dataset, it would overfit and fail. Random Forests are fast, highly accurate on small tabular data, and highly *interpretable* (we can easily see which feature impacted the student's score the most).

### The 11 Training Features
When the model trains, it doesn't just look at a quiz score. It looks at 11 behavioral features to predict true mastery:
1. `quiz_accuracy`: The raw score on the latest quiz.
2. `avg_time_per_question`: How long they hesitated/thought.
3. `total_attempts`: How many times they retook quizzes on this topic.
4. `videos_watched`: Engagement metric.
5. `articles_read`: Engagement metric.
6. `chatbot_questions`: Did they ask the AI for help? (Struggling students who ask questions are treated differently than struggling students who give up).
7. `study_duration`: Total time spent in the session.
8. `daily_streak`: Consistency metric.
9. `ewma_accuracy`: Exponentially Weighted Moving Average. This tracks their *historical* trend on this topic, not just the single latest quiz.
10. `prerequisite_mastery`: A score derived from the Knowledge Graph indicating if they understand the foundational topics underneath this one.
11. `previous_attempt_accuracy`: Their score before this one.

---

## 3. The Continuous Retraining Pipeline (`retrain_model.py`)

The most advanced part of the ML architecture is how it transitions from fake data to real data seamlessly. This is handled by the `retrain_model.py` script.

### Data Blending Strategy
Every time the model is scheduled to retrain, it checks the ratio of real data (`real_student_dataset.csv`) to synthetic data (`ai_learn_performance_dataset.csv`).
- **Phase 1 (Synthetic Only)**: If real data is less than 5%, it trains only on synthetic data.
- **Phase 2 (Blend)**: If real data is between 5% and 25%, it concatenates both datasets equally.
- **Phase 3 (Weighted)**: If real data is between 25% and 75%, it *samples down* (throws away) a large portion of the synthetic data so the real data has more influence.
- **Phase 4 (Real Only)**: Once real data surpasses 95% of the volume, it completely discards the synthetic dataset. 

This ensures the model gradually unlearns the synthetic simulation and adapts exactly to how real students interact with the platform.

### Automated Rollbacks & Versioning
When `retrain_model.py` finishes training, it tests the new model's accuracy. 
- It reads `history.json` to see the accuracy of the currently deployed production model.
- If the newly trained model is **better** (or equal), it overwrites `models/production.pkl` and saves a versioned copy (like `random_forest_v3.pkl`) in the artifacts folder.
- If the new model performs **worse** (e.g., because a batch of bad data came in), it rejects the deployment, throws a warning, and saves it as `_rejected.pkl`, keeping the old production model safely in place.

## ML Model Limitations & Known Data Leakage
- **`topic_id` feature data leakage**: The `topic_id` variable is currently included in the model's feature set and ranks somewhat high in feature importance. Including a raw integer ID means the model is partially learning topic-specific patterns by memorizing IDs rather than learning generalizable signals. This is a known overfitting concern and should be acknowledged in any academic papers or architectural reviews describing the system. Future retrains may remove this feature to ensure pure generalization.
- **Model Nuance & Guardrails**: Previously, the system used a hard override that forced a "Weak" classification regardless of the model's prediction if raw scores dipped below 60%. This has been removed to allow the ML model to speak for itself, relying solely on its internal confidence scores rather than deterministic overrides.
