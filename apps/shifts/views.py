from django.db import transaction
from rest_framework import views, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import WorkShift
from .serializers import WorkShiftSerializer
from apps.users.models import Branch
from apps.users.permissions import IsCashier, check_branch_access
from rest_framework.exceptions import PermissionDenied, ValidationError


class ShiftManageView(views.APIView):
    """
    POST /api/v1/shifts/action/
    Requires Header: "Authorization: Bearer <access_token>"
    """
    permission_classes = [IsCashier]

    def post(self, request):
        action = request.data.get("action")
        branch_id = request.data.get("branch_id")
        amount = request.data.get("amount", 0)

        # МАГИЯ: Django сам расшифровал токен и положил юзера сюда
        user = request.user

        branch = get_object_or_404(Branch, id=branch_id, is_deleted=False)

        if not check_branch_access(user, str(branch.id)):
            raise PermissionDenied("You do not have access to this branch.")

        # --- ОТКРЫТИЕ ---
        if action == "OPEN":
            with transaction.atomic():
                # Lock branch row to serialize concurrent OPEN attempts
                locked_branch = Branch.objects.select_for_update().get(pk=branch.pk)
                if WorkShift.objects.filter(branch=locked_branch, status=WorkShift.Status.OPEN).exists():
                    return Response({"error": "Shift already open"}, status=400)

                shift = WorkShift.objects.create(
                    branch=locked_branch,
                    opened_by=user,
                    opening_cash=amount,
                    status=WorkShift.Status.OPEN
                )
            return Response({"status": "Shift Opened", "shift": WorkShiftSerializer(shift).data})

        # --- ЗАКРЫТИЕ ---
        elif action == "CLOSE":
            shift = WorkShift.objects.filter(branch=branch, status=WorkShift.Status.OPEN).last()
            if not shift:
                return Response({"error": "No open shift found"}, status=400)

            shift.close_shift(user=user, counted_cash=amount)

            return Response({"status": "Shift Closed", "shift": WorkShiftSerializer(shift).data})

        return Response({"error": "Invalid action"}, status=400)


class ShiftCurrentView(views.APIView):
    """
    GET /api/v1/shifts/current/?branch_id=<uuid>
    Returns the currently open shift, or 404 if none.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        branch_id = request.query_params.get("branch_id")
        if not branch_id:
            raise ValidationError({"branch_id": "Required."})
        if not check_branch_access(request.user, branch_id):
            raise PermissionDenied("No access to this branch.")
        shift = WorkShift.objects.filter(
            branch_id=branch_id, status=WorkShift.Status.OPEN
        ).select_related("opened_by").last()
        if not shift:
            return Response({"open": False, "shift": None})
        return Response({"open": True, "shift": WorkShiftSerializer(shift).data})
