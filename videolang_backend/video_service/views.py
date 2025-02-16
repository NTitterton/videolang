from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
import boto3
from botocore.config import Config
from django.conf import settings
from .models import Video, VideoQuestion
from .serializers import VideoSerializer
from django.contrib.auth.models import User
from openai import OpenAI
import cv2
import numpy as np
import base64
from io import BytesIO
import requests
from PIL import Image
import json
import os

client = OpenAI(api_key=settings.OPENAI_API_KEY)

class VideoViewSet(viewsets.ModelViewSet):
    queryset = Video.objects.all()
    serializer_class = VideoSerializer

    def perform_create(self, serializer):
        user = User.objects.first()
        if not user:
            user = User.objects.create_user(username='default', password='default')
        
        video = serializer.save(user=user)
        print(f"Starting processing for video {video.id}")
        
        try:
            # Download video from S3
            print(f"Downloading video from {video.file_url}")
            video_response = requests.get(video.file_url)
            video_path = f"/tmp/{video.id}.mp4"
            with open(video_path, 'wb') as f:
                f.write(video_response.content)

            frame_analysis = []
            try:
                # Extract frames and analyze
                print("Starting frame analysis...")
                cap = cv2.VideoCapture(video_path)
                if not cap.isOpened():
                    raise Exception("Failed to open video file")
                
                fps = cap.get(cv2.CAP_PROP_FPS)
                total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                duration = total_frames / fps
                frame_count = 0
                
                print(f"Video duration: {duration:.1f} seconds")
                
                while cap.isOpened():
                    ret, frame = cap.read()
                    if not ret:
                        break
                        
                    current_time = cap.get(cv2.CAP_PROP_POS_FRAMES) / fps
                    
                    # Process every second
                    if int(current_time) == current_time:  # Only process at whole seconds
                        print(f"Analyzing frame at {current_time:.1f}s ({(current_time/duration*100):.1f}% complete)")
                        frame_count += 1
                        # Convert frame to base64
                        _, buffer = cv2.imencode('.jpg', frame)
                        base64_image = base64.b64encode(buffer).decode('utf-8')
                        
                        vision_response = client.chat.completions.create(
                            model="gpt-4o-mini",
                            messages=[
                                {
                                    "role": "user",
                                    "content": [
                                        {
                                            "type": "text",
                                            "text": "Describe what you see in this frame, focusing on key objects, actions, and events. Be concise."
                                        },
                                        {
                                            "type": "image_url",
                                            "image_url": {
                                                "url": f"data:image/jpeg;base64,{base64_image}",
                                                "detail": "low"
                                            }
                                        }
                                    ]
                                }
                            ],
                            max_tokens=100
                        )
                        
                        frame_analysis.append({
                            'timestamp': current_time,
                            'description': vision_response.choices[0].message.content
                        })
                
                cap.release()
                print(f"Analyzed {frame_count} frames")
            except Exception as e:
                print(f"Vision analysis failed: {str(e)}")
                # Continue with transcription even if vision fails

            # Get transcript
            print("Starting transcription...")
            with open(video_path, 'rb') as audio_file:
                transcript = client.audio.transcriptions.create(
                    file=audio_file,
                    model="whisper-1"
                )
            
            # Update video
            print("Saving results...")
            video.transcript = transcript.text
            if frame_analysis:
                video.visual_analysis = frame_analysis
            video.processed = True
            video.save()
            print(f"Video {video.id} processed successfully. processed={video.processed}")
            
        except Exception as e:
            print(f'Processing error for video {video.id}:', str(e))
            video.processed = False
            video.save()
        finally:
            if os.path.exists(video_path):
                os.remove(video_path)

    @action(detail=False, methods=['POST'])
    def upload_url(self, request):
        """Generate a pre-signed URL for direct S3 upload"""
        filename = request.data.get('filename')
        if not filename:
            return Response(
                {'error': 'Filename is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            s3_client = boto3.client(
                's3',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_S3_REGION_NAME,
                config=Config(signature_version='s3v4')
            )
            print('S3 Client created with:', {
                'region': settings.AWS_S3_REGION_NAME,
                'bucket': settings.AWS_STORAGE_BUCKET_NAME
            })

            presigned_url = s3_client.generate_presigned_url(
                'put_object',
                Params={
                    'Bucket': settings.AWS_STORAGE_BUCKET_NAME,
                    'Key': f'videos/{filename}',
                    'ContentType': 'video/mp4'
                },
                ExpiresIn=3600  # URL expires in 1 hour
            )
            print('Generated presigned URL:', presigned_url)
            
            return Response({
                'upload_url': presigned_url,
                'file_url': f"https://{settings.AWS_STORAGE_BUCKET_NAME}.s3.{settings.AWS_S3_REGION_NAME}.amazonaws.com/videos/{filename}"
            })
        except Exception as e:
            print('Error generating presigned URL:', str(e))
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['POST'])
    def ask(self, request, pk=None):
        video = self.get_object()
        question = request.data.get('question')
        
        if not video.transcript:
            return Response({'error': 'Video not processed yet'}, status=400)

        try:
            # Combine transcript and visual analysis for better answers
            prompt = f"""
            Video Transcript: {video.transcript}
            
            Visual Analysis (timestamp: description):
            {json.dumps(video.visual_analysis, indent=2)}
            
            Question: {question}
            
            Using both the transcript and visual analysis, find the most relevant timestamp and provide an answer.
            Return your response in this format:
            Timestamp: [time in seconds]
            Answer: [your answer]
            """

            response = client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that answers questions about videos using both audio and visual information."},
                    {"role": "user", "content": prompt}
                ]
            )

            # Parse response to extract timestamp and answer
            response_text = response.choices[0].message.content
            timestamp_line = response_text.split('\n')[0]
            answer_line = response_text.split('\n')[1]
            
            timestamp = float(timestamp_line.split(': ')[1])
            answer = answer_line.split(': ')[1]

            # Save the question and answer
            VideoQuestion.objects.create(
                video=video,
                question=question,
                answer=answer,
                timestamp=timestamp
            )
            
            return Response({
                'answer': answer,
                'timestamp': timestamp
            })

        except Exception as e:
            print('Error processing question:', str(e))
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )