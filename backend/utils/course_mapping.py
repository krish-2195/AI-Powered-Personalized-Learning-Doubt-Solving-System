class CourseMappingService:
    _mappings = {
        'Computer Science': [
            'Mathematics',
            'Object-Oriented Programming (OOP)',
            'Data Structures',
            'Algorithms',
            'Database Management System (DBMS)',
            'Operating Systems (OS)',
            'Computer Networks (CN)',
            'Python',
            'Artificial Intelligence Fundamentals',
            'Machine Learning',
            'Deep Learning',
            'NLP',
            'Computer Vision',
            'Generative AI',
            'MLOps'
        ],
        'Information Technology': [
            'Mathematics',
            'Object-Oriented Programming (OOP)',
            'Database Management System (DBMS)',
            'Operating Systems (OS)',
            'Computer Networks (CN)',
            'Web Development',
            'Cloud Computing',
            'Cyber Security'
        ],
        'Software Engineering': [
            'Mathematics',
            'Object-Oriented Programming (OOP)',
            'Data Structures',
            'Algorithms',
            'Database Management System (DBMS)',
            'Operating Systems (OS)',
            'Computer Networks (CN)',
            'Software Engineering',
            'Design Patterns',
            'Testing',
            'DevOps',
            'System Design'
        ],
        'Data Science': [
            'Mathematics',
            'Python',
            'Statistics',
            'Database Management System (DBMS)',
            'Data Structures',
            'Algorithms',
            'Artificial Intelligence Fundamentals',
            'Machine Learning',
            'Deep Learning',
            'NLP',
            'Computer Vision',
            'Generative AI',
            'MLOps'
        ]
    }

    CSV_TO_USER_SUBJECT = {
        'DSA': 'Data Structures',
        'DBMS': 'Database Management System (DBMS)',
        'OOP': 'Object-Oriented Programming (OOP)',
        'OS': 'Operating Systems (OS)',
        'CN': 'Computer Networks (CN)',
        'AI Fundamentals': 'Artificial Intelligence Fundamentals'
    }

    USER_TO_CSV_SUBJECT = {v: k for k, v in CSV_TO_USER_SUBJECT.items()}

    @classmethod
    def get_mappings(cls):
        return cls._mappings

    @classmethod
    def validate_course_subject(cls, course: str, subjects: list[str]) -> bool:
        mappings = cls.get_mappings()
        
        # Soft match course: check if any key of mappings is in the input course, or vice versa
        matched_course = None
        for c in mappings.keys():
            if c.lower() in course.lower() or course.lower() in c.lower():
                matched_course = c
                break
                
        if not matched_course:
            return False
            
        valid_subjects = mappings[matched_course]
        
        # Soft match subjects
        for sub in subjects:
            sub_lower = sub.lower().strip()
            match_found = False
            for val_sub in valid_subjects:
                val_sub_lower = val_sub.lower()
                if sub_lower == val_sub_lower:
                    match_found = True
                    break
                if f"({sub_lower})" in val_sub_lower or val_sub_lower.startswith(sub_lower):
                    match_found = True
                    break
                if sub_lower in val_sub_lower:
                    match_found = True
                    break
            if not match_found:
                return False
                
        return True
