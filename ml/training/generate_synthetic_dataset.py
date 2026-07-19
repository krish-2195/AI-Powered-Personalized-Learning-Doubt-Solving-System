"""
Synthetic Dataset Generator — AI Learn Platform
Generates application-native student performance data matching the
PostgreSQL TopicPerformance schema, for training Random Forest Model #2.

Each row = one student's performance snapshot on one topic.
"""

import numpy as np
import pandas as pd
import networkx as nx
import json
from pathlib import Path

np.random.seed(42)

# ──────────────────────────────────────────────────────────────────
# 1. Load real topic structure from your own datasets
# ──────────────────────────────────────────────────────────────────

BASE_DIR = Path(__file__).resolve().parent.parent

QUESTION_BANK_PATH = BASE_DIR / "datasets" / "question_bank.json"
TOPIC_RELATIONSHIPS_PATH = BASE_DIR / "datasets" / "topic_relationships.csv"

with open(QUESTION_BANK_PATH) as f:
    qb = json.load(f)
qb_df = pd.DataFrame(qb)

topic_subject_map = qb_df[['topic', 'topic_id', 'subject']].drop_duplicates().set_index('topic')

rel = pd.read_csv(TOPIC_RELATIONSHIPS_PATH)
G = nx.DiGraph()
for _, row in rel.iterrows():
    G.add_edge(row['parent_topic'], row['child_topic'])

TOPICS = list(topic_subject_map.index)

# Prerequisite chain depth (ancestor count in knowledge graph) -> proxy for topic difficulty
depth_map = {}
for t in TOPICS:
    depth_map[t] = len(nx.ancestors(G, t)) if t in G else 1
max_depth = max(depth_map.values())

# ──────────────────────────────────────────────────────────────────
# 2. Simulation parameters
# ──────────────────────────────────────────────────────────────────

N_STUDENTS = 600
ROWS_PER_STUDENT_RANGE = (3, 12)   # each student attempts 3-12 different topics
TOTAL_ROWS_TARGET = 4000

DIFFICULTY_WEIGHTS = {'Easy': 0.4, 'Medium': 0.4, 'Hard': 0.2}

# Each synthetic student has a hidden "ability" trait (0-1) representing
# overall competence. This drives every observable feature, with noise.
# Mixture of three sub-populations (weak/average/strong learners) for realistic spread
ability_component = np.random.choice([0, 1, 2], size=N_STUDENTS, p=[0.3, 0.4, 0.3])
student_ability = np.where(
    ability_component == 0, np.random.beta(2, 5, N_STUDENTS),   # weaker cluster, mean ~0.29
    np.where(
        ability_component == 1, np.random.beta(5, 5, N_STUDENTS),  # average cluster, mean ~0.5
        np.random.beta(6, 2, N_STUDENTS)                            # strong cluster, mean ~0.75
    )
)

# Each student also has a hidden "engagement" trait — independent of ability,
# some bright students are lazy, some average students grind hard.
student_engagement = np.random.beta(a=4, b=4, size=N_STUDENTS)


def sample_topic_sequence():
    """Pick a random subset of topics a student has attempted."""
    n = np.random.randint(*ROWS_PER_STUDENT_RANGE)
    return np.random.choice(TOPICS, size=min(n, len(TOPICS)), replace=False)


rows = []
row_id = 1

for student_idx in range(N_STUDENTS):
    user_id = f"U{1000 + student_idx}"
    ability = student_ability[student_idx]
    engagement = student_engagement[student_idx]

    topics_attempted = sample_topic_sequence()

    # Track per-student running accuracy history for EWMA + previous_attempt
    prev_accuracy = None
    ewma = ability * 100  # initialize EWMA near true ability

    for topic in topics_attempted:
        depth = depth_map[topic]
        topic_difficulty_norm = depth / max_depth if max_depth > 0 else 0.3  # 0=easy chain, 1=deep chain
        question_difficulty = np.random.choice(
            ['Easy', 'Medium', 'Hard'],
            p=[DIFFICULTY_WEIGHTS['Easy'], DIFFICULTY_WEIGHTS['Medium'], DIFFICULTY_WEIGHTS['Hard']]
        )
        diff_penalty = {'Easy': 0.0, 'Medium': 0.12, 'Hard': 0.25}[question_difficulty]

        # ── Core latent performance signal ──
        # accuracy depends on: ability, topic prerequisite depth (harder if deep),
        # question difficulty, and some randomness
        base_perf = ability - (0.15 * topic_difficulty_norm) - (diff_penalty * 0.6)
        noise = np.random.normal(0, 0.10)
        true_perf = np.clip(base_perf + noise, 0.02, 0.99)

        # ── Quiz accuracy (%) ──
        quiz_accuracy = round(true_perf * 100, 1)

        # ── Total attempts: weaker/less confident students retry more ──
        total_attempts = int(np.clip(np.random.poisson(lam=(1 + (1 - true_perf) * 3)), 1, 8))

        # ── Avg time per question (seconds): inversely related to ability,
        #     harder topics & questions take longer ──
        base_time = 25 + (1 - ability) * 40 + topic_difficulty_norm * 20 + diff_penalty * 60
        avg_time_per_question = round(np.clip(np.random.normal(base_time, 8), 8, 180), 1)

        # ── Engagement-driven features ──
        videos_watched = int(np.clip(np.random.poisson(lam=engagement * 4), 0, 15))
        articles_read = int(np.clip(np.random.poisson(lam=engagement * 2.5), 0, 10))
        chatbot_questions = int(np.clip(
            np.random.poisson(lam=(1 - true_perf) * engagement * 5), 0, 20
        ))  # struggling + engaged students ask more
        study_duration = round(np.clip(
            np.random.normal(15 + engagement * 45, 12), 2, 180
        ), 1)  # minutes
        daily_streak = int(np.clip(np.random.poisson(lam=engagement * 10), 0, 60))

        # ── Prerequisite mastery: avg of (1 - depth_norm) and ability, simulating
        #     a knowledge-graph-derived mastery score ──
        prereq_mastery = round(np.clip(
            (ability * 0.7 + (1 - topic_difficulty_norm) * 0.3) * 100 + np.random.normal(0, 5),
            0, 100
        ), 1)

        # ── EWMA accuracy (smoothed across student's history) ──
        alpha = 0.3
        ewma = alpha * quiz_accuracy + (1 - alpha) * ewma
        ewma_accuracy = round(ewma, 1)

        # ── Previous attempt accuracy ──
        previous_attempt_accuracy = round(prev_accuracy, 1) if prev_accuracy is not None else round(quiz_accuracy, 1)
        prev_accuracy = quiz_accuracy

        # ── Composite score blends accuracy, time efficiency, attempts, and mastery
        time_penalty = max(0, (avg_time_per_question - 35) / 300)       # softer, only penalizes slow
        attempts_penalty = max(0, (total_attempts - 2) * 0.02)          # softer
        composite = (
            0.55 * (quiz_accuracy / 100)
            + 0.25 * (prereq_mastery / 100)
            + 0.20 * (ewma_accuracy / 100)
            - time_penalty
            - attempts_penalty
        )
        composite = np.clip(composite, 0, 1)

        if composite < 0.40:
            label = 'Weak'
        elif composite < 0.62:
            label = 'Moderate'
        else:
            label = 'Strong'

        rows.append({
            'user_id': user_id,
            'topic_id': int(topic_subject_map.loc[topic, 'topic_id']),
            'topic': topic,
            'subject': topic_subject_map.loc[topic, 'subject'],
            'quiz_accuracy': quiz_accuracy,
            'avg_time_per_question': avg_time_per_question,
            'total_attempts': total_attempts,
            'question_difficulty': question_difficulty,
            'videos_watched': videos_watched,
            'articles_read': articles_read,
            'chatbot_questions': chatbot_questions,
            'study_duration': study_duration,
            'daily_streak': daily_streak,
            'ewma_accuracy': ewma_accuracy,
            'prerequisite_mastery': prereq_mastery,
            'previous_attempt_accuracy': previous_attempt_accuracy,
            'label': label,
        })
        row_id += 1

df = pd.DataFrame(rows)

# Trim/pad to target size if needed (keep natural variation, just cap)
if len(df) > TOTAL_ROWS_TARGET:
    df = df.sample(n=TOTAL_ROWS_TARGET, random_state=42).reset_index(drop=True)

print(f"Generated {len(df)} rows across {df['user_id'].nunique()} students and {df['topic'].nunique()} topics")
print()
print("Label distribution:")
print(df['label'].value_counts())
print()
print("Label distribution (%):")
print((df['label'].value_counts(normalize=True) * 100).round(1))
print()
print(df.head(10).to_string())
print()
print("Summary stats:")
print(df.describe())

OUTPUT_PATH = BASE_DIR / "datasets" / "ai_learn_performance_dataset.csv"
df.to_csv(OUTPUT_PATH, index=False)
print(f"\nSaved to {OUTPUT_PATH}")
