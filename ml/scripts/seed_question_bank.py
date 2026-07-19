import json
import os
import sys

# Add the project root to sys.path so we can import from backend/database
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from database.connection import SessionLocal, engine
from database.models.postgres_models import Base, Subject, Topic, QuestionBank

def seed_question_bank():
    print("Creating tables if they do not exist...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    json_path = os.path.join(os.path.dirname(__file__), '../datasets/question_bank.json')
    if not os.path.exists(json_path):
        print(f"File not found: {json_path}")
        return

    print("Loading question_bank.json...")
    with open(json_path, 'r', encoding='utf-8') as f:
        questions = json.load(f)
    
    print(f"Loaded {len(questions)} questions from JSON. Pre-fetching topics...")
    
    # Caches
    subject_cache = {s.name: s.id for s in db.query(Subject).all()}
    topic_cache = {(t.name, t.subject_id): t.id for t in db.query(Topic).all()}
    
    added_count = 0
    batch_size = 500
    batch = []
    
    for item in questions:
        # Get or create Subject
        subject_name = item.get("subject")
        if not subject_name:
            continue
            
        if subject_name not in subject_cache:
            subject = Subject(name=subject_name)
            db.add(subject)
            db.commit()
            db.refresh(subject)
            subject_cache[subject_name] = subject.id
            
        subject_id = subject_cache[subject_name]
            
        # Get or create Topic
        topic_name = item.get("topic")
        if not topic_name:
            continue
            
        if (topic_name, subject_id) not in topic_cache:
            topic = Topic(name=topic_name, subject_id=subject_id, difficulty_level=item.get("difficulty"))
            db.add(topic)
            db.commit()
            db.refresh(topic)
            topic_cache[(topic_name, subject_id)] = topic.id
            
        topic_id = topic_cache[(topic_name, subject_id)]
            
        question_text = item.get("question")
        options = item.get("options", [])
        
        # Tags formatting (list to string if needed, depending on model. It seems to be string in model)
        tags = item.get("tags")
        if isinstance(tags, list):
            tags = ",".join(tags)
            
        new_q = QuestionBank(
            topic_id=topic_id,
            difficulty=item.get("difficulty"),
            question=question_text,
            option_a=options[0] if len(options) > 0 else "",
            option_b=options[1] if len(options) > 1 else "",
            option_c=options[2] if len(options) > 2 else "",
            option_d=options[3] if len(options) > 3 else "",
            correct_answer=item.get("correct_answer"),
            explanation=item.get("explanation"),
            estimated_time=item.get("estimated_time"),
            tags=tags,
            bloom_level=item.get("bloom_level"),
            learning_outcome=item.get("learning_outcome")
        )
        batch.append(new_q)
        
        if len(batch) >= batch_size:
            db.bulk_save_objects(batch)
            db.commit()
            added_count += len(batch)
            batch = []
            print(f"Inserted {added_count} questions...")
            
    if batch:
        db.bulk_save_objects(batch)
        db.commit()
        added_count += len(batch)
        
    db.close()
    print(f"Successfully seeded {added_count} new questions!")

if __name__ == "__main__":
    seed_question_bank()
