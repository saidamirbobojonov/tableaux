from rest_framework import serializers
from .models import WorkShift


class WorkShiftSerializer(serializers.ModelSerializer):
    opened_by_email = serializers.EmailField(source="opened_by.email", read_only=True)
    closed_by_email = serializers.EmailField(source="closed_by.email", read_only=True, allow_null=True)
    duration_minutes = serializers.SerializerMethodField()

    class Meta:
        model = WorkShift
        fields = [
            "id", "branch", "status",
            "opened_by_email", "closed_by_email",
            "started_at", "ended_at", "duration_minutes",
            "opening_cash", "expected_cash", "actual_cash", "difference",
            "notes",
        ]
        read_only_fields = fields

    def get_duration_minutes(self, obj):
        if obj.ended_at and obj.started_at:
            delta = obj.ended_at - obj.started_at
            return int(delta.total_seconds() // 60)
        return None
