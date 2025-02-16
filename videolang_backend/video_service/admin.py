from django.contrib import admin
from .models import Video, VideoQuestion

@admin.register(Video)
class VideoAdmin(admin.ModelAdmin):
    list_display = ['title', 'processed', 'uploaded_at']
    list_filter = ['processed']

@admin.register(VideoQuestion)
class VideoQuestionAdmin(admin.ModelAdmin):
    list_display = ['video', 'question', 'timestamp', 'created_at'] 