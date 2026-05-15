from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.shortcuts import get_object_or_404
from .models import Category, BranchMenuItem, MenuItem, Allergen, ModifierGroup
from .serializers import (
    CategorySerializer, CategoryAdminSerializer,
    MenuItemAdminSerializer, AllergenAdminSerializer,
    ModifierGroupAdminSerializer,
)
from apps.users.models import Branch


class BranchMenuPublicView(generics.ListAPIView):
    """
    Public Endpoint: GET /api/v1/branches/<branch_id>/menu/
    Returns categories with their items, filtered by branch availability.
    """
    serializer_class = CategorySerializer
    authentication_classes = []  # Public access (no login needed for Menu)
    permission_classes = []

    def get_queryset(self):
        branch_id = self.kwargs.get("branch_id")
        # Ensure branch exists
        branch = get_object_or_404(Branch, id=branch_id, is_deleted=False)

        # Return categories that belong to this organization
        # Optimization: prefetch related items to avoid N+1 queries
        return Category.objects.filter(
            organization=branch.organization
        ).prefetch_related(
            "items",
            "items__variants",
            "items__branch_links"
        ).order_by("sort_order")

    def get_serializer_context(self):
        # Pass branch_id to serializer so it can calculate prices
        context = super().get_serializer_context()
        context["branch_id"] = self.kwargs.get("branch_id")
        return context


# ============================================================
# --- OWNER / ADMIN catalog management views ---
# ============================================================

def _get_org_or_403(request):
    """Return (org, None) or (None, Response 403)."""
    membership = request.user.memberships.filter(
        is_active=True, role__in=["OWNER", "REGIONAL", "BRANCH_MAN"]
    ).select_related("organization").first()
    if not membership:
        return None, Response({"detail": "No organization found."}, status=status.HTTP_403_FORBIDDEN)
    return membership.organization, None


class CategoryAdminListCreateView(APIView):
    """GET/POST /api/v1/catalog/admin/categories/"""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        org, err = _get_org_or_403(request)
        if err:
            return err
        qs = Category.objects.filter(organization=org, is_deleted=False).order_by("sort_order", "name")
        return Response(CategoryAdminSerializer(qs, many=True, context={"request": request}).data)

    def post(self, request):
        org, err = _get_org_or_403(request)
        if err:
            return err
        ser = CategoryAdminSerializer(data=request.data, context={"request": request, "organization": org})
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data, status=status.HTTP_201_CREATED)


class CategoryAdminDetailView(APIView):
    """GET/PATCH/DELETE /api/v1/catalog/admin/categories/<uuid:pk>/"""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def _get(self, request, pk):
        org, err = _get_org_or_403(request)
        if err:
            return None, None, err
        obj = get_object_or_404(Category, pk=pk, organization=org, is_deleted=False)
        return obj, org, None

    def get(self, request, pk):
        obj, org, err = self._get(request, pk)
        if err:
            return err
        return Response(CategoryAdminSerializer(obj, context={"request": request}).data)

    def patch(self, request, pk):
        obj, org, err = self._get(request, pk)
        if err:
            return err
        ser = CategoryAdminSerializer(obj, data=request.data, partial=True, context={"request": request, "organization": org})
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)

    def delete(self, request, pk):
        obj, org, err = self._get(request, pk)
        if err:
            return err
        obj.soft_delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MenuItemAdminListCreateView(APIView):
    """GET/POST /api/v1/catalog/admin/items/"""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        org, err = _get_org_or_403(request)
        if err:
            return err
        qs = (
            MenuItem.objects
            .filter(organization=org, is_deleted=False)
            .select_related("category")
            .prefetch_related("variants", "allergens", "modifier_groups")
            .order_by("category__sort_order", "name")
        )
        return Response(MenuItemAdminSerializer(qs, many=True, context={"request": request}).data)

    def post(self, request):
        org, err = _get_org_or_403(request)
        if err:
            return err
        ser = MenuItemAdminSerializer(data=request.data, context={"request": request, "organization": org})
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data, status=status.HTTP_201_CREATED)


class MenuItemAdminDetailView(APIView):
    """GET/PATCH/DELETE /api/v1/catalog/admin/items/<uuid:pk>/"""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def _get(self, request, pk):
        org, err = _get_org_or_403(request)
        if err:
            return None, None, err
        obj = get_object_or_404(MenuItem, pk=pk, organization=org, is_deleted=False)
        return obj, org, None

    def get(self, request, pk):
        obj, org, err = self._get(request, pk)
        if err:
            return err
        return Response(MenuItemAdminSerializer(obj, context={"request": request}).data)

    def patch(self, request, pk):
        obj, org, err = self._get(request, pk)
        if err:
            return err
        ser = MenuItemAdminSerializer(obj, data=request.data, partial=True, context={"request": request, "organization": org})
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)

    def delete(self, request, pk):
        obj, org, err = self._get(request, pk)
        if err:
            return err
        obj.soft_delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AllergenAdminListCreateView(APIView):
    """GET/POST /api/v1/catalog/admin/allergens/"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        org, err = _get_org_or_403(request)
        if err:
            return err
        qs = Allergen.objects.filter(organization=org).order_by("name")
        return Response(AllergenAdminSerializer(qs, many=True).data)

    def post(self, request):
        org, err = _get_org_or_403(request)
        if err:
            return err
        ser = AllergenAdminSerializer(data=request.data, context={"organization": org})
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data, status=status.HTTP_201_CREATED)


class AllergenAdminDetailView(APIView):
    """PATCH/DELETE /api/v1/catalog/admin/allergens/<pk>/"""
    permission_classes = [IsAuthenticated]

    def _get(self, request, pk):
        org, err = _get_org_or_403(request)
        if err:
            return None, None, err
        obj = get_object_or_404(Allergen, pk=pk, organization=org)
        return obj, org, None

    def patch(self, request, pk):
        obj, org, err = self._get(request, pk)
        if err:
            return err
        ser = AllergenAdminSerializer(obj, data=request.data, partial=True, context={"organization": org})
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)

    def delete(self, request, pk):
        obj, org, err = self._get(request, pk)
        if err:
            return err
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ModifierGroupAdminListCreateView(APIView):
    """GET/POST /api/v1/catalog/admin/modifier-groups/"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        org, err = _get_org_or_403(request)
        if err:
            return err
        qs = ModifierGroup.objects.prefetch_related("modifiers").order_by("name")
        return Response(ModifierGroupAdminSerializer(qs, many=True).data)

    def post(self, request):
        org, err = _get_org_or_403(request)
        if err:
            return err
        ser = ModifierGroupAdminSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data, status=status.HTTP_201_CREATED)


class ModifierGroupAdminDetailView(APIView):
    """PATCH/DELETE /api/v1/catalog/admin/modifier-groups/<pk>/"""
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        org, err = _get_org_or_403(request)
        if err:
            return err
        obj = get_object_or_404(ModifierGroup, pk=pk)
        ser = ModifierGroupAdminSerializer(obj, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)

    def delete(self, request, pk):
        org, err = _get_org_or_403(request)
        if err:
            return err
        obj = get_object_or_404(ModifierGroup, pk=pk)
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)