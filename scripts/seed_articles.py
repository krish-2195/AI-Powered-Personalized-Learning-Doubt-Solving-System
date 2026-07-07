import sys
import os
import random

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.connection import get_db
from database.models.postgres_models import Topic, Content

def seed_articles():
    db = next(get_db())
    
    # Get all existing topics
    topics = db.query(Topic).all()
    if not topics:
        print("No topics found in the database. Run seed_content.py first.")
        return
        
    print(f"Found {len(topics)} topics. Seeding 30 articles...")
    
    article_titles = [
        "A Deep Dive into {topic}",
        "Understanding the Basics of {topic}",
        "Advanced Patterns in {topic}",
        "Mastering {topic} for Interviews",
        "The Complete Guide to {topic}",
        "Common Pitfalls with {topic}",
        "Real-world Applications of {topic}",
        "Why {topic} is Crucial for Software Engineers",
        "Visualizing {topic} in Memory",
        "Optimizing Performance with {topic}"
    ]
    
    added_count = 0
    for i in range(30):
        topic = random.choice(topics)
        template = random.choice(article_titles)
        title = template.format(topic=topic.name)
        
        # Check if already exists
        existing = db.query(Content).filter(Content.title == title).first()
        if not existing:
            new_article = Content(
                topic_id=topic.id,
                content_type="article",
                title=title,
                text_content=f"This is a comprehensive article about {topic.name}. It covers all the essential details and provides clear examples.",
                difficulty=random.choice(["Beginner", "Medium", "Hard"]),
                duration_minutes=random.randint(5, 20),
                url="https://example.com/article"
            )
            db.add(new_article)
            added_count += 1
            
    db.commit()
    print(f"Successfully added {added_count} articles.")

if __name__ == "__main__":
    seed_articles()
