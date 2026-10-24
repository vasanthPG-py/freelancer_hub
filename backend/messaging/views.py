from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from .models import Conversation, Message, Notification
from .serializers import (
    ConversationListSerializer,
    ConversationDetailSerializer,
    MessageCreateSerializer,
    MessageSerializer,
    NotificationSerializer,
)
from accounts.models import User


class ConversationListAPIView(generics.ListAPIView):
    """List all conversations for the authenticated user."""
    serializer_class = ConversationListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Conversation.objects.filter(
            participants=self.request.user
        ).prefetch_related('participants', 'messages').select_related('project', 'contract')

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context


class ConversationDetailAPIView(generics.RetrieveAPIView):
    """Get conversation detail with all messages."""
    serializer_class = ConversationDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        conversation = get_object_or_404(
            Conversation,
            pk=self.kwargs['pk'],
            participants=self.request.user
        )
        # Mark all messages in this conversation as read
        for msg in conversation.messages.exclude(sender=self.request.user):
            msg.mark_read_for(self.request.user)
        return conversation

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context


class MessageSendAPIView(APIView):
    """Send a message in a conversation."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        conversation = get_object_or_404(
            Conversation,
            pk=pk,
            participants=request.user
        )

        serializer = MessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        message = Message.objects.create(
            conversation=conversation,
            sender=request.user,
            content=serializer.validated_data['content']
        )

        # Update conversation timestamp
        conversation.save()

        return Response(MessageSerializer(message).data, status=status.HTTP_201_CREATED)


class StartConversationAPIView(APIView):
    """
    Start or retrieve a conversation with another user about a project.
    Used when a freelancer or customer wants to chat about a bid/project.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        other_user_id = request.data.get('user_id')
        project_id = request.data.get('project_id')

        if not other_user_id:
            return Response({'error': 'user_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            other_user = User.objects.get(pk=other_user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        if other_user == request.user:
            return Response({'error': 'Cannot start a conversation with yourself.'}, status=status.HTTP_400_BAD_REQUEST)

        # Find existing conversation between these two users about this project
        existing = Conversation.objects.filter(
            participants=request.user
        ).filter(
            participants=other_user
        )
        if project_id:
            existing = existing.filter(project_id=project_id)

        existing = existing.first()

        if existing:
            return Response({
                'conversation_id': existing.id,
                'created': False,
            })

        # Create new conversation
        from projects.models import Project
        project = None
        if project_id:
            try:
                project = Project.objects.get(pk=project_id)
            except Project.DoesNotExist:
                pass

        conversation = Conversation.objects.create(project=project)
        conversation.participants.add(request.user, other_user)

        return Response({
            'conversation_id': conversation.id,
            'created': True,
        }, status=status.HTTP_201_CREATED)


class UnreadCountAPIView(APIView):
    """Returns total unread message count for the authenticated user."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        total = 0
        conversations = Conversation.objects.filter(participants=request.user)
        for conv in conversations:
            total += conv.unread_count_for(request.user)
        return Response({'unread_count': total})


class NotificationListAPIView(APIView):
    """Return notifications for the authenticated user, newest first, with unread count."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = Notification.objects.filter(user=request.user)
        only_unread = request.query_params.get('unread', '')
        if only_unread.lower() in ('1', 'true'):
            qs = qs.filter(is_read=False)
        serialized = NotificationSerializer(qs, many=True).data
        unread_count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({
            'unread_count': unread_count,
            'results': serialized,
        })


class NotificationMarkReadAPIView(APIView):
    """Mark a single notification as read for the authenticated user."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        notification = get_object_or_404(Notification, pk=pk, user=request.user)
        notification.is_read = True
        notification.save(update_fields=['is_read'])
        return Response(NotificationSerializer(notification).data)


class NotificationMarkAllReadAPIView(APIView):
    """Mark ALL unread notifications as read for the authenticated user."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        updated = Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({'marked_read': updated})
