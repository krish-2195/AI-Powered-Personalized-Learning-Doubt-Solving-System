
import joblib
import pandas as pd
import numpy as np

# 1. Load Model and Encoder
model = joblib.load('random_forest.pkl')
encoder = joblib.load('label_encoder.pkl')

# 2. Define Feature Order
features = ['gender', 'NationalITy', 'PlaceofBirth', 'StageID', 'GradeID', 'SectionID', 
            'Topic', 'Semester', 'Relation', 'raisedhands', 'VisITedResources', 
            'AnnouncementsView', 'Discussion', 'ParentAnsweringSurvey', 
            'ParentschoolSatisfaction', 'StudentAbsenceDays']

# 3. Sample Input (Already Encoded/Numerical)
sample_data = pd.DataFrame([[1, 4, 4, 2, 1, 0, 7, 0, 0, 15, 16, 2, 20, 1, 1, 1]], columns=features)

# 4. Predict
prediction = model.predict(sample_data)
print(f'Predicted Class Index: {prediction[0]}')
