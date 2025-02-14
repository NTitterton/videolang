from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
import boto3
from botocore.config import Config
from django.conf import settings
from .models import Video
from .serializers import VideoSerializer

class VideoViewSet(viewsets.ModelViewSet):
    queryset = Video.objects.all()
    serializer_class = VideoSerializer

    @action(detail=False, methods=['POST'])
    def upload_url(self, request):
        """Generate a pre-signed URL for direct S3 upload"""
        filename = request.data.get('filename')
        if not filename:
            return Response(
                {'error': 'Filename is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME,
            config=Config(signature_version='s3v4')
        )

        try:
            presigned_url = s3_client.generate_presigned_url(
                'put_object',
                Params={
                    'Bucket': settings.AWS_STORAGE_BUCKET_NAME,
                    'Key': f'videos/{filename}',
                    'ContentType': 'video/mp4'
                },
                ExpiresIn=3600  # URL expires in 1 hour
            )
            
            return Response({
                'upload_url': presigned_url,
                'file_url': f"https://{settings.AWS_STORAGE_BUCKET_NAME}.s3.{settings.AWS_S3_REGION_NAME}.amazonaws.com/videos/{filename}"
            })
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            ) 