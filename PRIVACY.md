# Privacy Policy

Learning Scores is a professional film music learning platform. This document describes how we collect, use, store, and protect your data.

## Data Collected

We collect the following categories of data:

### Account Data
- **Email address** – used for authentication and account recovery
- **Display name** – shown to teachers and in class rosters
- **User ID** – internal identifier (Firebase Auth UID)

### Learning Data
- **Class enrollments** – which classes you are enrolled in
- **Assignment submissions** – audio, video, or score files you submit for assignments
- **Quiz attempts** – your answers and scores
- **Teacher feedback** – voice or video feedback from instructors
- **Portfolio items** – work you choose to showcase
- **Certifications** – credentials issued by teachers

### Payment Data
- **Payment references** – Stripe payment/checkout IDs (we do not store card numbers)
- **Stripe Connect account ID** – for teachers who receive payments (stored in teacher settings)

### Usage Data
- **Rate limit records** – timestamps of API calls for abuse prevention (stored temporarily)

## How Data Is Used

- **Authentication** – to sign you in and verify your identity
- **Course access** – to determine which classes and content you can access
- **Grading and feedback** – so teachers can review and respond to your work
- **Payments** – to process class purchases and pay teachers (via Stripe)
- **AI analysis** – optional AI-assisted analysis of submissions (Google Gemini) when teachers use this feature

## Third-Party Services

| Service | Purpose | Data shared |
|--------|---------|-------------|
| **Firebase** (Google) | Authentication, database, storage, hosting | Account data, learning data, files |
| **Stripe** | Payments and teacher payouts | Email, payment references |
| **Google Gemini** | Optional AI analysis of submissions | Media references and content for analysis (when enabled) |

## Data Retention

- **Account data** – retained until you delete your account
- **Submissions and feedback** – retained for the duration of the class and as needed for records
- **Rate limits** – timestamps are trimmed; only recent entries are kept
- **Payment references** – retained for financial and access-grant purposes

## Your Rights

- **Access** – you can view your data in the app
- **Correction** – you can update profile information (e.g. display name)
- **Deletion** – you can request account deletion; we will remove your data subject to legal retention requirements
- **Export** – you can request an export of your data

To exercise these rights, contact the platform administrator or the teacher whose class you are in.

## Data Security

- **Encryption in transit** – all data is transmitted over HTTPS
- **Encryption at rest** – Firebase encrypts data at rest by default
- **Access controls** – Firestore and Storage rules enforce role-based access (student, teacher, admin)
- **Secrets** – API keys for Stripe and Gemini are stored server-side only and never exposed to clients

## Changes

We may update this policy from time to time. Material changes will be communicated to users.

---

*Last updated: March 2025*
