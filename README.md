# VideoLang

VideoLang is a web application that analyzes videos using OpenCV and OpenAI's Vision API to provide detailed descriptions of video content. You can then ask questions and have a followup chat with the video! Created for the Roe AI take home assessment.

Live version: https://videolang.vercel.app

## Architecture

- Frontend: Next.js (deployed on Vercel)
- Backend: Django REST Framework (deployed on Render)
- Storage: AWS S3
- AI: OpenAI Vision API

### Running locally:
Clone and set up backend:
```bash
git clone https://github.com/NTitterton/videolang.git
cd videolang
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```
Create a .env file in videolang_backend with:
```bash
DJANGO_SECRET_KEY=your_secret_key
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_STORAGE_BUCKET_NAME=videolang-bucket
AWS_S3_REGION_NAME=us-west-1
OPENAI_API_KEY=your_openai_key
```
Then run:
```bash
cd videolang_backend
python manage.py migrate
python manage.py runserver
```
Set up frontend:
```bash
cd videolang-frontend
npm install
```
Create .env.local with:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```
Then run:

```bash
npm run dev
```
The app will be available at http://localhost:3000
