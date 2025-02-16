from django.db import models
from django.contrib.auth.models import User

class Video(models.Model):
    title = models.CharField(max_length=255)
    file_url = models.URLField()
    transcript = models.TextField(blank=True, null=True)
    visual_analysis = models.JSONField(blank=True, null=True)
    processed = models.BooleanField(default=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

class VideoQuestion(models.Model):
    video = models.ForeignKey(Video, on_delete=models.CASCADE)
    question = models.TextField()
    timestamp = models.FloatField()  # timestamp in seconds
    answer = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.video.title} - {self.question[:50]}" 