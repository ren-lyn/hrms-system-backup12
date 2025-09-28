# Disciplinary Action Categories Reference

## Overview
This document provides a comprehensive reference for all disciplinary action categories available in the HRMS system. The categories are organized by severity level and include suggested actions for each violation type.

## Usage
Run the seeder using one of these commands:
```bash
# Standard seeding
php artisan db:seed --class=DisciplinaryCategorySeeder

# Using the custom command
php artisan disciplinary:seed-categories

# Fresh seed (clears existing data)
php artisan disciplinary:seed-categories --fresh
```

## Categories by Severity Level

### MINOR SEVERITY (8 Categories)
These violations typically result in coaching, verbal warnings, or written warnings.

1. **Tardiness**
   - Description: Habitual lateness or arriving after scheduled start time without valid reason
   - Suggested Actions: verbal_warning, written_warning, final_warning

2. **Poor Performance**
   - Description: Consistently failing to meet job requirements or performance standards
   - Suggested Actions: coaching, performance_improvement_plan, written_warning, training

3. **Dress Code Violation**
   - Description: Failure to adhere to company dress code and appearance policies
   - Suggested Actions: verbal_warning, written_warning

4. **Personal Use of Company Resources**
   - Description: Minor unauthorized use of company equipment, internet, or phone for personal matters
   - Suggested Actions: verbal_warning, written_warning, coaching

5. **Workplace Housekeeping**
   - Description: Failure to maintain clean and organized workspace according to company standards
   - Suggested Actions: verbal_warning, written_warning, training

6. **Minor Policy Violation**
   - Description: Non-compliance with minor company policies and procedures
   - Suggested Actions: verbal_warning, written_warning, mandatory_training

7. **Excessive Personal Calls/Texts**
   - Description: Frequent personal phone calls or text messaging during work hours
   - Suggested Actions: verbal_warning, written_warning, coaching

8. **Attendance Issues**
   - Description: Occasional unexplained absences or failure to follow proper absence reporting procedures
   - Suggested Actions: verbal_warning, written_warning, counseling

### MAJOR SEVERITY (10 Categories)
These violations typically result in written warnings, suspensions, or termination.

1. **Absenteeism**
   - Description: Unauthorized absence or excessive absences affecting work productivity
   - Suggested Actions: written_warning, final_warning, suspension, termination

2. **Insubordination**
   - Description: Refusal to follow legitimate orders or disrespectful behavior towards supervisors
   - Suggested Actions: written_warning, final_warning, suspension, termination

3. **Misconduct**
   - Description: Inappropriate behavior or violation of company policies affecting workplace harmony
   - Suggested Actions: written_warning, final_warning, suspension, mandatory_training

4. **Safety Violation**
   - Description: Failure to follow safety protocols or creating unsafe working conditions
   - Suggested Actions: safety_training, written_warning, suspension, termination

5. **Unprofessional Conduct**
   - Description: Behavior that is unprofessional and negatively impacts the work environment
   - Suggested Actions: written_warning, final_warning, suspension, mandatory_training

6. **Discrimination**
   - Description: Treating individuals unfairly based on protected characteristics
   - Suggested Actions: final_warning, suspension, termination, mandatory_training

7. **Falsification of Records**
   - Description: Deliberately providing false information in company records or reports
   - Suggested Actions: final_warning, suspension, termination

8. **Conflict of Interest**
   - Description: Engaging in activities that conflict with company interests or duties
   - Suggested Actions: written_warning, final_warning, suspension, termination

9. **Violation of IT Policies**
   - Description: Serious breach of information technology and cybersecurity policies
   - Suggested Actions: mandatory_training, written_warning, suspension

10. **Inappropriate Use of Social Media**
    - Description: Misuse of social media that damages company reputation or violates policies
    - Suggested Actions: written_warning, final_warning, suspension, mandatory_training

### SEVERE SEVERITY (13 Categories)
These violations typically result in immediate suspension, termination, or legal action.

1. **Harassment**
   - Description: Unwelcome conduct that creates a hostile, intimidating, or offensive work environment
   - Suggested Actions: suspension, termination, mandatory_training, mandatory_counseling

2. **Sexual Harassment**
   - Description: Unwelcome sexual advances, requests for sexual favors, or other sexual conduct
   - Suggested Actions: suspension, termination, legal_action, mandatory_counseling

3. **Theft**
   - Description: Stealing company property, time, resources, or intellectual property
   - Suggested Actions: suspension, termination, legal_action

4. **Fraud**
   - Description: Intentional deception or misrepresentation for personal or financial gain
   - Suggested Actions: termination, legal_action

5. **Embezzlement**
   - Description: Theft or misappropriation of funds or property entrusted to one's care
   - Suggested Actions: termination, legal_action

6. **Confidentiality Breach**
   - Description: Unauthorized disclosure of confidential company or client information
   - Suggested Actions: suspension, termination, legal_action

7. **Substance Abuse**
   - Description: Use of alcohol or drugs that affects work performance, safety, or workplace conduct
   - Suggested Actions: mandatory_counseling, suspension, termination

8. **Violence or Threats**
   - Description: Physical violence, threats of violence, or intimidating behavior towards others
   - Suggested Actions: suspension, termination, legal_action

9. **Workplace Bullying**
   - Description: Repeated unreasonable behavior directed towards an employee that creates health and safety risks
   - Suggested Actions: final_warning, suspension, termination, mandatory_counseling

10. **Sabotage**
    - Description: Deliberate destruction or damage to company property, systems, or operations
    - Suggested Actions: suspension, termination, legal_action

11. **Bribery and Corruption**
    - Description: Offering, accepting, or soliciting bribes or engaging in corrupt practices
    - Suggested Actions: termination, legal_action

12. **Data Breach**
    - Description: Unauthorized access, disclosure, or misuse of sensitive company or customer data
    - Suggested Actions: suspension, termination, legal_action

13. **Criminal Activity**
    - Description: Engaging in criminal behavior that affects the workplace or company reputation
    - Suggested Actions: suspension, termination, legal_action

## Available Suggested Actions

### Progressive Discipline Actions
- **verbal_warning**: Informal counseling session with documentation
- **written_warning**: Formal written notice placed in employee file
- **final_warning**: Last warning before termination
- **suspension**: Temporary removal from work (paid/unpaid)
- **termination**: End of employment relationship

### Developmental Actions
- **coaching**: One-on-one guidance and support
- **training**: Skill development or policy education
- **performance_improvement_plan**: Structured plan with measurable goals
- **mandatory_training**: Required training completion
- **safety_training**: Specific safety protocol education

### Support Actions
- **counseling**: Professional guidance and support
- **mandatory_counseling**: Required professional counseling

### Career Impact Actions
- **demotion**: Reduction in position or responsibilities

### Legal Actions
- **legal_action**: Involvement of legal authorities or proceedings

## Statistics Summary
- **Total Categories**: 31
- **Minor Severity**: 8 categories (26%)
- **Major Severity**: 10 categories (32%)
- **Severe Severity**: 13 categories (42%)

## Notes
- All categories are created as active (`is_active = true`)
- Categories can be deactivated through the admin interface
- Suggested actions are recommendations and can be customized per organization
- Legal actions should always involve proper legal consultation