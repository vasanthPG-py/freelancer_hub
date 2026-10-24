from django.urls import path
from .views import (
    ConversationListAPIView,
    ConversationDetailAPIView,
    MessageSendAPIView,
    StartConversationAPIView,
    UnreadCountAPIView,
    NotificationListAPIView,
    NotificationMarkReadAPIView,
    NotificationMarkAllReadAPIView,
)

urlpatterns = [
    # Conversations
    path('', ConversationListAPIView.as_view(), name='conversation-list'),
    path('start/', StartConversationAPIView.as_view(), name='conversation-start'),
    path('unread/', UnreadCountAPIView.as_view(), name='conversation-unread'),
    path('<int:pk>/', ConversationDetailAPIView.as_view(), name='conversation-detail'),
    path('<int:pk>/send/', MessageSendAPIView.as_view(), name='message-send'),

    # Notifications
    path('notifications/', NotificationListAPIView.as_view(), name='notification-list'),
    path('notifications/<int:pk>/read/', NotificationMarkReadAPIView.as_view(), name='notification-mark-read'),
    path('notifications/read-all/', NotificationMarkAllReadAPIView.as_view(), name='notification-mark-all-read'),
]
