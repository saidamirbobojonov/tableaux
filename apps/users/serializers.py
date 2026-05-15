from rest_framework import serializers
from .models import Branch, BranchWorkSchedule, WeekDay, Membership, User, UserRole, Table


class WorkScheduleSerializer(serializers.ModelSerializer):
    day_name = serializers.CharField(source="get_day_display", read_only=True)

    class Meta:
        model = BranchWorkSchedule
        fields = ["day", "day_name", "is_closed", "open_time", "close_time"]


class BranchPublicSerializer(serializers.ModelSerializer):
    schedule = WorkScheduleSerializer(source="schedules", many=True, read_only=True)

    class Meta:
        model = Branch
        fields = [
            "id", "name", "slug", "description",
            "address", "phone", "whatsapp", "instagram",
            "logo", "cover_image",
            "timezone", "currency",
            "primary_color", "secondary_color",
            "default_delivery_fee", "default_tip_percent",
            "schedule",
        ]


class StaffMemberSerializer(serializers.ModelSerializer):
    """Read: membership + nested user info."""
    id = serializers.UUIDField(source="user.id", read_only=True)
    membership_id = serializers.UUIDField(source="pk", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    first_name = serializers.CharField(source="user.first_name", read_only=True)
    last_name = serializers.CharField(source="user.last_name", read_only=True)
    phone = serializers.CharField(source="user.phone", read_only=True)
    avatar = serializers.SerializerMethodField()
    date_joined = serializers.DateTimeField(source="user.date_joined", read_only=True)

    class Meta:
        model = Membership
        fields = [
            "id", "membership_id", "email", "first_name", "last_name",
            "phone", "avatar", "role", "is_active", "date_joined",
        ]

    def get_avatar(self, obj):
        request = self.context.get("request")
        if obj.user.avatar and request:
            return request.build_absolute_uri(obj.user.avatar.url)
        return None


class InviteStaffSerializer(serializers.Serializer):
    """Create a new user + membership (invite)."""
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150, default="")
    last_name = serializers.CharField(max_length=150, default="")
    phone = serializers.CharField(max_length=20, allow_blank=True, default="")
    role = serializers.ChoiceField(choices=UserRole.choices)
    password = serializers.CharField(min_length=6, write_only=True)


class UpdateStaffSerializer(serializers.ModelSerializer):
    class Meta:
        model = Membership
        fields = ["role", "is_active"]


class TableSerializer(serializers.ModelSerializer):
    class Meta:
        model = Table
        fields = ["id", "number", "name", "capacity", "status", "is_active",
                  "pos_x", "pos_y", "width", "height", "shape"]


class TableWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Table
        fields = ["number", "name", "capacity", "is_active",
                  "pos_x", "pos_y", "width", "height", "shape"]

    def create(self, validated_data):
        branch = self.context["branch"]
        return Table.objects.create(branch=branch, **validated_data)


class BranchUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = [
            "name", "description", "address", "phone",
            "whatsapp", "instagram", "timezone", "currency",
            "logo", "cover_image",
            "primary_color", "secondary_color",
            "default_delivery_fee", "default_tip_percent",
        ]


class ScheduleUpdateSerializer(serializers.ModelSerializer):
    day_name = serializers.CharField(source="get_day_display", read_only=True)

    class Meta:
        model = BranchWorkSchedule
        fields = ["day", "day_name", "is_closed", "open_time", "close_time"]