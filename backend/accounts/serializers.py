from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.contrib.auth.password_validation import validate_password
from .models import User

class UserSerializer(serializers.ModelSerializer):
    """Public/self serializer for User model."""
    full_name = serializers.ReadOnlyField()

    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'first_name',
            'last_name',
            'full_name',
            'role',
            'phone_number',
            'is_verified',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'email', 'role', 'is_verified', 'created_at', 'updated_at']


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Handles role-specific user registration for Customers and Freelancers."""
    password = serializers.CharField(write_only=True, required=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = [
            'email',
            'first_name',
            'last_name',
            'role',
            'phone_number',
            'password',
            'password_confirm',
        ]

    def validate_role(self, value):
        if value not in [User.Role.CUSTOMER, User.Role.FREELANCER]:
            raise serializers.ValidationError("Role must be either CUSTOMER or FREELANCER.")
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        validate_password(attrs['password'])
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = User.objects.create_user(password=password, **validated_data)
        return user


class UserLoginSerializer(serializers.Serializer):
    """Authenticates credentials and returns JWT access and refresh tokens."""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs.get('email', '').strip().lower()
        password = attrs.get('password')

        if not email or not password:
            raise serializers.ValidationError("Both email and password are required.")

        user = authenticate(username=email, password=password)
        if not user:
            raise serializers.ValidationError("Invalid email or password.")

        if not user.is_active:
            raise serializers.ValidationError("This account is currently disabled.")

        refresh = RefreshToken.for_user(user)
        # Include custom claims
        refresh['role'] = user.role
        refresh['email'] = user.email

        return {
            'user': user,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }


class PasswordResetRequestSerializer(serializers.Serializer):
    """Initiates password reset flow without leaking account existence."""
    email = serializers.EmailField()

    def validate_email(self, value):
        return value.strip().lower()

    def save(self):
        email = self.validated_data['email']
        try:
            user = User.objects.get(email__iexact=email, is_active=True)
            token_generator = PasswordResetTokenGenerator()
            token = token_generator.make_token(user)
            uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
            # In production, this sends an email. In development, we generate the uid and token.
            return {
                'uidb64': uidb64,
                'token': token,
                'simulated_reset_link': f"/auth/reset-password?uid={uidb64}&token={token}",
            }
        except User.DoesNotExist:
            # Silently succeed to prevent account enumeration
            return None


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Validates reset token and sets new password."""
    uidb64 = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, min_length=8)
    new_password_confirm = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({"new_password_confirm": "Passwords do not match."})

        validate_password(attrs['new_password'])

        try:
            user_id = force_str(urlsafe_base64_decode(attrs['uidb64']))
            user = User.objects.get(pk=user_id)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            raise serializers.ValidationError({"token": "Invalid or expired reset link."})

        token_generator = PasswordResetTokenGenerator()
        if not token_generator.check_token(user, attrs['token']):
            raise serializers.ValidationError({"token": "Invalid or expired reset link."})

        attrs['user'] = user
        return attrs

    def save(self):
        user = self.validated_data['user']
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user


class LogoutSerializer(serializers.Serializer):
    """Accepts a refresh token and permanently blacklists it."""
    refresh = serializers.CharField()

    def validate(self, attrs):
        self.token = attrs['refresh']
        return attrs

    def save(self, **kwargs):
        try:
            token = RefreshToken(self.token)
            token.blacklist()
        except Exception:
            # Token may already be blacklisted or invalid
            pass
