from rest_framework import serializers
from .models import Conversation, Message, MessageReadReceipt, Notification



class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    sender_role = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ['id', 'sender', 'sender_name', 'sender_role', 'content', 'attachment', 'created_at', 'is_system_message']
        read_only_fields = ['id', 'sender', 'sender_name', 'sender_role', 'created_at', 'is_system_message']

    def get_sender_name(self, obj):
        return obj.sender.full_name or obj.sender.email

    def get_sender_role(self, obj):
        return obj.sender.role


class MessageCreateSerializer(serializers.Serializer):
    content = serializers.CharField(min_length=1, max_length=5000)


class ConversationListSerializer(serializers.ModelSerializer):
    other_participant = serializers.SerializerMethodField()
    last_message_preview = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    project_title = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ['id', 'other_participant', 'last_message_preview', 'unread_count', 'project_title', 'updated_at']

    def get_other_participant(self, obj):
        request_user = self.context['request'].user
        other = obj.participants.exclude(pk=request_user.pk).first()
        if other:
            return {'id': other.id, 'name': other.full_name or other.email, 'role': other.role}
        return None

    def get_last_message_preview(self, obj):
        msg = obj.last_message
        if msg:
            return {'content': msg.content[:100], 'created_at': msg.created_at}
        return None

    def get_unread_count(self, obj):
        return obj.unread_count_for(self.context['request'].user)

    def get_project_title(self, obj):
        if obj.project:
            return obj.project.title
        if obj.contract:
            return obj.contract.project.title
        return None


class ConversationDetailSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)
    other_participant = serializers.SerializerMethodField()
    project_title = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ['id', 'other_participant', 'project_title', 'messages', 'created_at']

    def get_other_participant(self, obj):
        request_user = self.context['request'].user
        other = obj.participants.exclude(pk=request_user.pk).first()
        if other:
            return {'id': other.id, 'name': other.full_name or other.email, 'role': other.role}
        return None

    def get_project_title(self, obj):
        if obj.project:
            return obj.project.title
        if obj.contract:
            return obj.contract.project.title
        return None


class NotificationSerializer(serializers.ModelSerializer):
    """Serializes in-app notifications for the authenticated user."""

    class Meta:
        model = Notification
        fields = [
            'id', 'notification_type', 'title', 'message',
            'link', 'is_read', 'created_at',
        ]
        read_only_fields = ['id', 'notification_type', 'title', 'message', 'link', 'created_at']
