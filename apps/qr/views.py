from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from .models import QRCode
from .serializers import QRCodeSerializer


class ResolveQRCodeView(APIView):
    """
    GET /api/v1/qr/<token>/
    Публичный эндпоинт. Превращает токен в контекст (Branch ID + Table).
    """
    authentication_classes = []  # Public
    permission_classes = []

    def get(self, request, token):
        qr = get_object_or_404(QRCode, token=token)

        if not qr.is_active:
            return Response({"detail": "QR Code is inactive"}, status=status.HTTP_403_FORBIDDEN)

        serializer = QRCodeSerializer(qr)
        return Response(serializer.data)