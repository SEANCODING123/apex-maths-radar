"""
Generate sample student quiz data for testing the radar visualization.
Creates realistic data simulating students taking the Apex Maths assessment.
"""
import csv
import random
from datetime import datetime, timedelta

# Competencies by grade level (from the question bank)
GRADE_COMPETENCIES = {
    4: ['NUM-MultiDigit', 'COMP-Advanced', 'MEAS-Standard', 'GEOM-Reasoning'],
    5: ['COMP-Advanced', 'NUM-Large', 'NUM-FracDec', 'MEAS-Advanced'],
    6: ['NUM-FracDec', 'DATA-Represent', 'NUM-Theory', 'RATIO-Proportion'],
    7: ['RATIO-Proportion', 'ALG-PreAlg', 'GEOM-Advanced', 'NUM-Theory'],
    8: ['ALG-PreAlg', 'GEOM-Advanced', 'NUM-AdvSystems', 'GEOM-Coord'],
    9: ['ALG-Manipulation', 'FUNC-Relationships', 'GEOM-Coord', 'GEOM-Advanced'],
    10: ['ALG-Manipulation', 'FUNC-Relationships', 'NUM-AdvSystems', 'GEOM-Trig'],
    11: ['FUNC-Advanced', 'CALC-Foundations', 'GEOM-Trig', 'DATA-Stats'],
    12: ['FUNC-Advanced', 'CALC-Foundations', 'DATA-Stats', 'GEOM-Trig']
}

# Question types per competency (6 questions each: T1=2, T2=2, T3=2)
QUESTIONS_PER_COMPETENCY = 6

# South African names for realistic data
FIRST_NAMES = ['Thabo', 'Lerato', 'Sipho', 'Naledi', 'Johan', 'Fatima', 'Ayesha', 
               'Pieter', 'Zanele', 'Mandla', 'Caitlin', 'Ravi', 'Lindiwe', 'James',
               'Precious', 'David', 'Neo', 'Palesa', 'Mohammed', 'Sarah']
LAST_NAMES = ['Nkosi', 'Dlamini', 'Van der Merwe', 'Pillay', 'Mokoena', 'Smith',
              'Ndlovu', 'Botha', 'Govender', 'Molefe', 'Williams', 'Tshabalala']


def generate_question_id(grade, competency, q_type, seq):
    """Generate question ID matching Moodle format"""
    return f"G{grade}_{competency}_T{q_type}_{seq:02d}"


def simulate_student_performance(student_grade, base_skill=0.7):
    """
    Simulate a student's quiz attempt.
    - All students attempt ALL grades (4-12)
    - Performance decreases as questions exceed their grade level
    - No wrong-answer limit - just time limit
    """
    responses = []
    
    start_time = datetime(2026, 2, 1, 9, 0, 0)
    current_time = start_time
    time_limit_seconds = 90 * 60  # 90 minutes
    
    # Go through ALL grades (4 -> 12)
    for grade in range(4, 13):
        competencies = GRADE_COMPETENCIES[grade]
        
        for comp in competencies:
            # Check time limit
            elapsed = (current_time - start_time).total_seconds()
            if elapsed >= time_limit_seconds:
                break
            
            for q_type in [1, 2, 3]:  # Type 1, 2, 3
                for seq in [1, 2]:  # 2 questions per type
                    # Calculate probability of correct answer
                    grade_diff = grade - student_grade
                    if grade_diff <= -2:
                        # Well below student level - very high success
                        prob_correct = 0.95
                    elif grade_diff <= 0:
                        # At or slightly below student level - high success
                        prob_correct = base_skill + 0.1
                    elif grade_diff == 1:
                        # One grade above - moderate success
                        prob_correct = base_skill - 0.05
                    elif grade_diff == 2:
                        # Two grades above - lower success
                        prob_correct = base_skill - 0.15
                    else:
                        # Far above student level - struggling but still trying
                        prob_correct = max(0.25, base_skill - (grade_diff * 0.1))
                    
                    # Type 3 (strategic) is harder
                    if q_type == 3:
                        prob_correct -= 0.05
                    
                    prob_correct = max(0.15, min(0.98, prob_correct))
                    is_correct = random.random() < prob_correct
                    
                    # Add time per question (faster at lower grades)
                    time_per_q = random.randint(15, 30) + (grade - 4) * 3
                    current_time += timedelta(seconds=time_per_q)
                    
                    question_id = generate_question_id(grade, comp, q_type, seq)
                    responses.append({
                        'question_id': question_id,
                        'grade_tag': f'Grade-{grade}',
                        'competency_tag': comp,
                        'type_tag': f'Type-{q_type}',
                        'is_correct': 1 if is_correct else 0,
                        'timestamp': current_time.isoformat()
                    })
    
    return responses, False  # Never stopped early


def generate_sample_data(num_students=30, output_file='data/sample_quiz_results.csv'):
    """Generate sample quiz data for multiple students"""
    all_rows = []
    
    for i in range(num_students):
        # Create student
        student_id = f"STU{i+1:03d}"
        first_name = random.choice(FIRST_NAMES)
        last_name = random.choice(LAST_NAMES)
        student_name = f"{first_name} {last_name}"
        
        # Assign a "true" grade level (what they should be capable of)
        student_grade = random.randint(4, 12)
        
        # Vary skill level
        base_skill = random.uniform(0.5, 0.9)
        
        responses, stopped_early = simulate_student_performance(student_grade, base_skill)
        
        for resp in responses:
            all_rows.append({
                'student_id': student_id,
                'student_name': student_name,
                'student_grade_level': student_grade,
                **resp
            })
    
    # Write to CSV
    if all_rows:
        fieldnames = ['student_id', 'student_name', 'student_grade_level', 
                      'question_id', 'grade_tag', 'competency_tag', 'type_tag',
                      'is_correct', 'timestamp']
        
        with open(output_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(all_rows)
        
        print(f"Generated {len(all_rows)} responses for {num_students} students")
        print(f"Saved to: {output_file}")
        
        # Summary stats
        students = set(row['student_id'] for row in all_rows)
        for sid in list(students)[:3]:
            student_rows = [r for r in all_rows if r['student_id'] == sid]
            correct = sum(r['is_correct'] for r in student_rows)
            total = len(student_rows)
            max_grade = max(int(r['grade_tag'].split('-')[1]) for r in student_rows)
            print(f"  {sid}: {correct}/{total} correct ({100*correct/total:.0f}%), reached Grade {max_grade}")


if __name__ == '__main__':
    generate_sample_data(num_students=30)
