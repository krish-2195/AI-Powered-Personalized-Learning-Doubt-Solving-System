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
                
            # Extract YouTube video id and details
            url = row['url'].strip()
            youtube_video_id = None
            youtube_url = None
            thumbnail_url = None
            
            if "youtube.com" in url.lower() or "youtu.be" in url.lower():
                import urllib.parse as urlparse
                parsed = urlparse.urlparse(url)
                if parsed.hostname in ('youtu.be', 'www.youtu.be'):
                    youtube_video_id = parsed.path[1:]
                elif parsed.hostname in ('youtube.com', 'www.youtube.com'):
                    if parsed.path == '/watch':
                        p = urlparse.parse_qs(parsed.query)
                        youtube_video_id = p.get('v', [None])[0]
                    elif parsed.path.startswith(('/embed/', '/v/')):
                        youtube_video_id = parsed.path.split('/')[2]
                
                if youtube_video_id:
                    youtube_url = url
                    thumbnail_url = f"https://img.youtube.com/vi/{youtube_video_id}/mqdefault.jpg"

            estimated_time = int(row['duration_minutes']) if row['duration_minutes'].isdigit() else 10
            description = row['description'].strip()
            content_type = "video" if youtube_video_id else "article"

            program_val = row.get('program', '').strip()
            # Generate search tags
            subject_val = row.get('subject', '').strip()
            topic_val = row.get('topic', '').strip()
            difficulty_val = row.get('difficulty', '').strip()
            title_val = row.get('title', '').strip()
            
            tag_set = {subject_val.lower(), topic_val.lower(), difficulty_val.lower()}
            for p in program_val.split(','):
                p_clean = p.strip()
                if p_clean:
                    tag_set.add(p_clean.lower())
                    if p_clean == 'CS': tag_set.add('computer science')
                    elif p_clean == 'IT': tag_set.add('information technology')
                    elif p_clean == 'SE': tag_set.add('software engineering')
                    elif p_clean == 'DS': tag_set.add('data science')
            
            for word in title_val.split():
                clean_word = "".join(c for c in word.lower() if c.isalnum())
                if len(clean_word) > 2:
                    tag_set.add(clean_word)
            tags_str = ",".join(sorted(list(tag_set)))

            # Check if content already exists
            existing_content = db.query(Content).filter(Content.title == row['title']).first()
            
            if existing_content:
                # Update existing content
                existing_content.content_type = content_type
                existing_content.url = url
                existing_content.description = description
                existing_content.text_content = description
                existing_content.estimated_time = estimated_time
                existing_content.duration_minutes = estimated_time
                existing_content.youtube_video_id = youtube_video_id
                existing_content.youtube_url = youtube_url
                existing_content.thumbnail_url = thumbnail_url
                existing_content.program = program_val
                existing_content.tags = tags_str
            else:
                content = Content(
                    topic_id=topic.id,
                    content_type=content_type,
                    title=row['title'],
                    description=description,
                    text_content=description,
                    difficulty=row['difficulty'],
                    duration_minutes=estimated_time,
                    url=url,
                    youtube_video_id=youtube_video_id,
                    youtube_url=youtube_url,
                    thumbnail_url=thumbnail_url,
                    estimated_time=estimated_time,
                    program=program_val,
                    tags=tags_str
                )
                db.add(content)
                added_count += 1
                
    db.commit()
    print(f"Successfully processed content updates/additions.")

if __name__ == "__main__":
    seed_content()
