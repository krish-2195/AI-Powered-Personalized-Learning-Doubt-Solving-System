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
        if course not in mappings:
            return False
        valid_subjects = set(mappings[course])
        return all(s in valid_subjects for s in subjects)
