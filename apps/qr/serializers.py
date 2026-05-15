from rest_framework import serializers
from .models import QRCode

class QRCodeSerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(source="branch.name", read_only=True)
    branch_id = serializers.UUIDField(source="branch.id", read_only=True)

    class Meta:
        model = QRCode
        fields = ["token", "branch_id", "branch_name", "type", "table_number", "is_active"]