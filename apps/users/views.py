from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.shortcuts import get_object_or_404
from .models import Branch, BranchWorkSchedule, Membership, User, Table
from .serializers import (
    BranchPublicSerializer, BranchUpdateSerializer, ScheduleUpdateSerializer,
    StaffMemberSerializer, InviteStaffSerializer, UpdateStaffSerializer,
    TableSerializer, TableWriteSerializer,
)


class BranchInfoView(generics.RetrieveAPIView):
    """
    GET /api/v1/auth/branches/<uuid:pk>/
    Публичная информация о заведении (для шапки сайта и футера).
    """
    queryset = Branch.objects.filter(is_deleted=False)
    serializer_class = BranchPublicSerializer
    authentication_classes = []
    permission_classes = []
    lookup_field = 'pk'


class MeView(APIView):
    """
    GET /api/v1/auth/me/
    Returns the current authenticated user's profile, role, and accessible branches.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        membership = (
            user.memberships
            .filter(is_active=True)
            .select_related("organization")
            .prefetch_related("allowed_branches")
            .first()
        )
        avatar_url = None
        if user.avatar:
            avatar_url = request.build_absolute_uri(user.avatar.url)

        branches = []
        if membership:
            allowed = list(membership.allowed_branches.filter(is_deleted=False))
            if not allowed:
                # No branch restriction → return all org branches
                allowed = list(
                    Branch.objects.filter(
                        organization=membership.organization, is_deleted=False
                    ).order_by("name")
                )
            branches = [
                {
                    "id": str(b.id),
                    "name": b.name,
                    "address": b.address,
                    "currency": b.currency,
                    "primary_color": b.primary_color,
                    "secondary_color": b.secondary_color,
                    "default_tip_percent": b.default_tip_percent,
                    "default_delivery_fee": str(b.default_delivery_fee),
                    "logo": request.build_absolute_uri(b.logo.url) if b.logo else None,
                }
                for b in allowed
            ]

        return Response({
            "id": str(user.id),
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "avatar": avatar_url,
            "role": membership.role if membership else None,
            "organization": membership.organization.name if membership else None,
            "organization_id": str(membership.organization.id) if membership else None,
            "branches": branches,
        })


class StaffListView(APIView):
    """
    GET  /api/v1/auth/staff/  — list all members of the caller's organization
    POST /api/v1/auth/staff/  — invite (create user + membership)
    """
    permission_classes = [IsAuthenticated]

    def _get_org(self, request):
        membership = request.user.memberships.filter(is_active=True).select_related("organization").first()
        if not membership:
            return None
        return membership.organization

    def get(self, request):
        org = self._get_org(request)
        if not org:
            return Response({"detail": "No organization found."}, status=status.HTTP_403_FORBIDDEN)
        memberships = (
            Membership.objects
            .filter(organization=org)
            .select_related("user")
            .order_by("user__date_joined")
        )
        serializer = StaffMemberSerializer(memberships, many=True, context={"request": request})
        return Response(serializer.data)

    def post(self, request):
        org = self._get_org(request)
        if not org:
            return Response({"detail": "No organization found."}, status=status.HTTP_403_FORBIDDEN)

        # Only OWNER and REGIONAL can invite staff
        caller_mem = request.user.memberships.filter(organization=org, is_active=True).first()
        if caller_mem.role not in ("OWNER", "REGIONAL"):
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        serializer = InviteStaffSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if User.objects.filter(email=data["email"]).exists():
            return Response({"detail": "A user with this email already exists."}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(
            email=data["email"],
            password=data["password"],
            first_name=data.get("first_name", ""),
            last_name=data.get("last_name", ""),
            phone=data.get("phone", ""),
        )
        membership = Membership.objects.create(
            user=user,
            organization=org,
            role=data["role"],
            is_active=True,
        )
        out = StaffMemberSerializer(membership, context={"request": request})
        return Response(out.data, status=status.HTTP_201_CREATED)


class StaffDetailView(APIView):
    """
    PATCH  /api/v1/auth/staff/<membership_id>/  — update role / is_active
    DELETE /api/v1/auth/staff/<membership_id>/  — remove from org (deactivate)
    """
    permission_classes = [IsAuthenticated]

    def _get_membership(self, request, pk):
        org_mem = request.user.memberships.filter(is_active=True).select_related("organization").first()
        if not org_mem or org_mem.role not in ("OWNER", "REGIONAL"):
            return None, Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)
        membership = get_object_or_404(Membership, pk=pk, organization=org_mem.organization)
        return membership, None

    def patch(self, request, pk):
        membership, err = self._get_membership(request, pk)
        if err:
            return err
        serializer = UpdateStaffSerializer(membership, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        out = StaffMemberSerializer(membership, context={"request": request})
        return Response(out.data)

    def delete(self, request, pk):
        membership, err = self._get_membership(request, pk)
        if err:
            return err
        # Prevent owner from removing themselves
        if membership.user == request.user:
            return Response({"detail": "Cannot remove yourself."}, status=status.HTTP_400_BAD_REQUEST)
        membership.is_active = False
        membership.save(update_fields=["is_active"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class BranchUpdateView(APIView):
    """
    GET  /api/v1/auth/branches/<uuid:pk>/manage/  — full branch data for owner
    PATCH /api/v1/auth/branches/<uuid:pk>/manage/ — update branch settings
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def _get_branch(self, request, pk):
        membership = request.user.memberships.filter(
            is_active=True, role__in=["OWNER", "REGIONAL", "BRANCH_MAN"]
        ).select_related("organization").first()
        if not membership:
            return None, Response({"detail": "No organization."}, status=status.HTTP_403_FORBIDDEN)
        branch = get_object_or_404(Branch, pk=pk, organization=membership.organization, is_deleted=False)
        return branch, None

    def get(self, request, pk):
        branch, err = self._get_branch(request, pk)
        if err:
            return err
        return Response(BranchUpdateSerializer(branch, context={"request": request}).data)

    def patch(self, request, pk):
        branch, err = self._get_branch(request, pk)
        if err:
            return err
        ser = BranchUpdateSerializer(branch, data=request.data, partial=True, context={"request": request})
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(BranchPublicSerializer(branch, context={"request": request}).data)


class ScheduleView(APIView):
    """
    GET /api/v1/auth/branches/<uuid:pk>/schedule/ — get all 7 days
    PUT /api/v1/auth/branches/<uuid:pk>/schedule/ — bulk upsert schedule
    """
    permission_classes = [IsAuthenticated]

    def _get_branch(self, request, pk):
        membership = request.user.memberships.filter(
            is_active=True, role__in=["OWNER", "REGIONAL", "BRANCH_MAN"]
        ).select_related("organization").first()
        if not membership:
            return None, Response({"detail": "No organization."}, status=status.HTTP_403_FORBIDDEN)
        branch = get_object_or_404(Branch, pk=pk, organization=membership.organization, is_deleted=False)
        return branch, None

    def get(self, request, pk):
        branch, err = self._get_branch(request, pk)
        if err:
            return err
        schedules = BranchWorkSchedule.objects.filter(branch=branch).order_by("day")
        return Response(ScheduleUpdateSerializer(schedules, many=True).data)

    def put(self, request, pk):
        branch, err = self._get_branch(request, pk)
        if err:
            return err
        items = request.data if isinstance(request.data, list) else request.data.get("schedules", [])
        results = []
        for item in items:
            day = item.get("day")
            if day is None:
                continue
            obj, _ = BranchWorkSchedule.objects.get_or_create(branch=branch, day=day)
            ser = ScheduleUpdateSerializer(obj, data=item, partial=True)
            ser.is_valid(raise_exception=True)
            ser.save()
            results.append(ser.data)
        return Response(results)


class TableListCreateView(APIView):
    """
    GET  /api/v1/auth/branches/<pk>/tables/  — list tables with live status
    POST /api/v1/auth/branches/<pk>/tables/  — create table
    """
    permission_classes = [IsAuthenticated]

    def _get_branch(self, request, pk):
        membership = request.user.memberships.filter(
            is_active=True, role__in=["OWNER", "REGIONAL", "BRANCH_MAN", "WAITER", "CHEF"]
        ).select_related("organization").first()
        if not membership:
            return None, Response({"detail": "No access."}, status=status.HTTP_403_FORBIDDEN)
        branch = get_object_or_404(Branch, pk=pk, organization=membership.organization, is_deleted=False)
        return branch, None

    def get(self, request, pk):
        branch, err = self._get_branch(request, pk)
        if err:
            return err
        tables = Table.objects.filter(branch=branch).order_by("number")
        return Response(TableSerializer(tables, many=True).data)

    def post(self, request, pk):
        branch, err = self._get_branch(request, pk)
        if err:
            return err
        ser = TableWriteSerializer(data=request.data, context={"branch": branch})
        ser.is_valid(raise_exception=True)
        table = ser.save()
        return Response(TableSerializer(table).data, status=status.HTTP_201_CREATED)


class TableDetailView(APIView):
    """
    PATCH  /api/v1/auth/branches/<pk>/tables/<table_pk>/
    DELETE /api/v1/auth/branches/<pk>/tables/<table_pk>/
    """
    permission_classes = [IsAuthenticated]

    def _get(self, request, pk, table_pk):
        membership = request.user.memberships.filter(
            is_active=True, role__in=["OWNER", "REGIONAL", "BRANCH_MAN", "WAITER", "CHEF"]
        ).select_related("organization").first()
        if not membership:
            return None, Response({"detail": "No access."}, status=status.HTTP_403_FORBIDDEN)
        branch = get_object_or_404(Branch, pk=pk, organization=membership.organization, is_deleted=False)
        table = get_object_or_404(Table, pk=table_pk, branch=branch)
        return table, None

    def patch(self, request, pk, table_pk):
        table, err = self._get(request, pk, table_pk)
        if err:
            return err
        # Allow status update (waiter marking reserved) or admin edits
        fields = list(request.data.keys())
        if fields == ["status"]:
            ser = TableSerializer(table, data={"status": request.data["status"]}, partial=True)
        else:
            ser = TableWriteSerializer(table, data=request.data, partial=True, context={"branch": table.branch})
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(TableSerializer(table).data)

    def delete(self, request, pk, table_pk):
        table, err = self._get(request, pk, table_pk)
        if err:
            return err
        table.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)