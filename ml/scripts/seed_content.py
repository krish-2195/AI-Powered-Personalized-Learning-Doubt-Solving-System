import csv
import os
import sys

# Add the project root to sys.path so we can import from backend/database
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from database.connection import SessionLocal, engine
from database.models.postgres_models import Base, Subject, Topic, Content

def seed_content_repository():
    print("Creating tables if they do not exist...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    csv_path = os.path.join(os.path.dirname(__file__), '../datasets/content_repository.csv')
    if not os.path.exists(csv_path):
        print(f"File not found: {csv_path}")
        return

    print("Loading content_repository.csv...")
    added_count = 0
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Get or create Subject
            subject_name = row.get("subject")
            if not subject_name:
                continue
                
            subject = db.query(Subject).filter(Subject.name == subject_name).first()
            if not subject:
                subject = Subject(name=subject_name)
                db.add(subject)
                db.commit()
                db.refresh(subject)
                
            # Get or create Topic
            topic_name = row.get("topic")
            if not topic_name:
                continue
                
            topic = db.query(Topic).filter(Topic.name == topic_name, Topic.subject_id == subject.id).first()
            if not topic:
                topic = Topic(name=topic_name, subject_id=subject.id, difficulty_level=row.get("difficulty"))
                db.add(topic)
                db.commit()
                db.refresh(topic)
                
            # Check if Content already exists (by URL to prevent duplicates)
            url = row.get("url")
            existing_c = db.query(Content).filter(Content.url == url).first()
            if not existing_c:
                new_content = Content(
                    topic_id=topic.id,
                    content_type="video",  # Defaulting to video given the youtube URLs
                    title=row.get("title"),
                    text_content=row.get("description"), # The description is the text to be vectorized by TF-IDF
                    difficulty=row.get("difficulty"),
                    duration_minutes=int(row.get("duration_minutes", 0)) if row.get("duration_minutes") else None,
                    url=url
                )
                db.add(new_content)
                added_count += 1

    db.commit()
    db.close()
    print(f"Successfully seeded {added_count} new content resources!")

if __name__ == "__main__":
    seed_content_repository()
