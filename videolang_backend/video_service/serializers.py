from rest_framework import serializers
from .models import Video, VideoQuestion

class VideoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Video
        fields = ['id', 'title', 'file_url', 'transcript', 'processed', 'uploaded_at', 'processing_status', 'processing_progress']
        read_only_fields = ['transcript', 'processed', 'processing_status', 'processing_progress'] 