from django.urls import path
from .views import (
    BranchMenuPublicView,
    CategoryAdminListCreateView, CategoryAdminDetailView,
    MenuItemAdminListCreateView, MenuItemAdminDetailView,
    AllergenAdminListCreateView, AllergenAdminDetailView,
    ModifierGroupAdminListCreateView, ModifierGroupAdminDetailView,
)
from apps.users.views import BranchInfoView

urlpatterns = [
    path("branches/<uuid:pk>/", BranchInfoView.as_view(), name="branch-info"),
    path("branches/<uuid:branch_id>/menu/", BranchMenuPublicView.as_view(), name="branch-menu"),

    # Admin CRUD
    path("admin/categories/", CategoryAdminListCreateView.as_view(), name="admin-categories"),
    path("admin/categories/<uuid:pk>/", CategoryAdminDetailView.as_view(), name="admin-category-detail"),
    path("admin/items/", MenuItemAdminListCreateView.as_view(), name="admin-items"),
    path("admin/items/<uuid:pk>/", MenuItemAdminDetailView.as_view(), name="admin-item-detail"),
    path("admin/allergens/", AllergenAdminListCreateView.as_view(), name="admin-allergens"),
    path("admin/allergens/<int:pk>/", AllergenAdminDetailView.as_view(), name="admin-allergen-detail"),
    path("admin/modifier-groups/", ModifierGroupAdminListCreateView.as_view(), name="admin-modifier-groups"),
    path("admin/modifier-groups/<int:pk>/", ModifierGroupAdminDetailView.as_view(), name="admin-modifier-group-detail"),
]