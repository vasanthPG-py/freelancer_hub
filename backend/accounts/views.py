from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from .serializers import (
    UserSerializer,
    UserRegistrationSerializer,
    UserLoginSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    LogoutSerializer,
)

class RegisterAPIView(APIView):
    """
    Public endpoint: Register a new customer or freelancer.
    Returns the newly created user profile and initial JWT access/refresh token pair.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            refresh['role'] = user.role
            refresh['email'] = user.email

            return Response({
                'message': 'Registration successful.',
                'user': UserSerializer(user).data,
                'tokens': {
                    'access': str(refresh.access_token),
                    'refresh': str(refresh),
                }
            }, status=status.HTTP_201_CREATED)
        return Response({
            'message': 'Registration validation failed.',
            'errors': serializer.errors,
        }, status=status.HTTP_400_BAD_REQUEST)


class LoginAPIView(APIView):
    """
    Public endpoint: Authenticates email and password.
    Returns user details and JWT access/refresh tokens.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid():
            data = serializer.validated_data
            user = data['user']
            return Response({
                'message': 'Login successful.',
                'user': UserSerializer(user).data,
                'tokens': {
                    'access': data['access'],
                    'refresh': data['refresh'],
                }
            }, status=status.HTTP_200_OK)
        return Response({
            'message': 'Login failed.',
            'errors': serializer.errors,
        }, status=status.HTTP_401_UNAUTHORIZED)


class LogoutAPIView(APIView):
    """
    Protected endpoint: Blacklists the provided refresh token so it cannot be used again.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({'message': 'Successfully logged out and session revoked.'}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CurrentUserAPIView(APIView):
    """
    Protected endpoint: View or update the currently authenticated user's profile.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request):
        allowed_fields = ['first_name', 'last_name', 'phone_number']
        update_data = {k: v for k, v in request.data.items() if k in allowed_fields}
        serializer = UserSerializer(request.user, data=update_data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({
                'message': 'Profile updated successfully.',
                'user': serializer.data,
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetRequestAPIView(APIView):
    """
    Public endpoint: Request a password reset link.
    Always returns 200 OK without disclosing account existence.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        if serializer.is_valid():
            result = serializer.save()
            response_payload = {
                'message': 'If an active account with this email exists, a password reset link has been dispatched.',
            }
            # For local demo/development convenience, include the generated link in debug response
            if result:
                response_payload['debug_simulated_link'] = result['simulated_reset_link']
                response_payload['uidb64'] = result['uidb64']
                response_payload['token'] = result['token']

            return Response(response_payload, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetConfirmAPIView(APIView):
    """
    Public endpoint: Submit token and new password to finalize reset.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({
                'message': 'Password has been reset successfully. You may now log in with your new password.'
            }, status=status.HTTP_200_OK)
        return Response({
            'message': 'Unable to reset password with the provided credentials.',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
