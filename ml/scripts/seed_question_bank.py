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
    
    added_count = 0
    
    for item in questions:
        # Get or create Subject
        subject_name = item.get("subject")
        if not subject_name:
            continue
            
        subject = db.query(Subject).filter(Subject.name == subject_name).first()
        if not subject:
            subject = Subject(name=subject_name)
            db.add(subject)
            db.commit()
            db.refresh(subject)
            
        # Get or create Topic
        topic_name = item.get("topic")
        if not topic_name:
            continue
            
        topic = db.query(Topic).filter(Topic.name == topic_name, Topic.subject_id == subject.id).first()
        if not topic:
            topic = Topic(name=topic_name, subject_id=subject.id, difficulty_level=item.get("difficulty"))
            db.add(topic)
            db.commit()
            db.refresh(topic)
            
        # Check if Question already exists to prevent duplicates
        question_text = item.get("question")
        existing_q = db.query(QuestionBank).filter(QuestionBank.question == question_text).first()
        if not existing_q:
            options = item.get("options", [])
            new_q = QuestionBank(
                topic_id=topic.id,
                difficulty=item.get("difficulty"),
                question=question_text,
                option_a=options[0] if len(options) > 0 else "",
                option_b=options[1] if len(options) > 1 else "",
                option_c=options[2] if len(options) > 2 else "",
                option_d=options[3] if len(options) > 3 else "",
                correct_answer=item.get("correct_answer"),
                explanation=item.get("explanation"),
                estimated_time=item.get("estimated_time"),
                tags=item.get("tags"),
                bloom_level=item.get("bloom_level"),
                learning_outcome=item.get("learning_outcome")
            )
            db.add(new_q)
            added_count += 1
            
    db.commit()
    db.close()
    print(f"Successfully seeded {added_count} new questions!")

if __name__ == "__main__":
    seed_question_bank()
