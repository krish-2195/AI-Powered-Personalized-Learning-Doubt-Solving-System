import csv
import sys
import os

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.connection import get_db
from database.models.postgres_models import Topic, Content, Subject

def seed_content():
    db = next(get_db())
    csv_path = os.path.join("ml", "datasets", "content_repository.csv")
    
    if not os.path.exists(csv_path):
        print(f"Error: {csv_path} not found.")
        return

    print("Seeding Content from CSV...")
    added_count = 0
    
    with open(csv_path, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Get or create Topic
            topic_name = row['topic'].strip()
            topic = db.query(Topic).filter(Topic.name.ilike(topic_name)).first()
            
            if not topic:
                # Need a subject for the topic
                subject_name = row['subject'].strip()
                subject = db.query(Subject).filter(Subject.name.ilike(subject_name)).first()
                if not subject:
                    subject = Subject(name=subject_name, description=f"{subject_name} Subject")
                    db.add(subject)
                    db.commit()
                    db.refresh(subject)
                    
                topic = Topic(name=topic_name, subject_id=subject.id, difficulty_level=row['difficulty'])
                db.add(topic)
                db.commit()
                db.refresh(topic)
                
            # Check if content already exists
            existing_content = db.query(Content).filter(Content.title == row['title']).first()
            
            if not existing_content:
                # Infer content type (if it's youtube it's video, else article. For MVP just say 'video' since csv says youtube)
                content_type = "video" if "youtube.com" in row['url'].lower() else "article"
                
                content = Content(
                    topic_id=topic.id,
                    content_type=content_type,
                    title=row['title'],
                    text_content=row['description'],
                    difficulty=row['difficulty'],
                    duration_minutes=int(row['duration_minutes']) if row['duration_minutes'].isdigit() else 10,
                    url=row['url']
                )
                db.add(content)
                added_count += 1
                
    db.commit()
    print(f"Successfully seeded {added_count} new content items.")

if __name__ == "__main__":
    seed_content()
