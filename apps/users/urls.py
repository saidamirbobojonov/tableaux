from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import BranchInfoView, MeView, StaffListView, StaffDetailView, BranchUpdateView, ScheduleView, TableListCreateView, TableDetailView

urlpatterns = [
    path("token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("me/", MeView.as_view(), name="me"),
    path("branches/<uuid:pk>/", BranchInfoView.as_view(), name="branch-info"),
    path("branches/<uuid:pk>/manage/", BranchUpdateView.as_view(), name="branch-manage"),
    path("branches/<uuid:pk>/schedule/", ScheduleView.as_view(), name="branch-schedule"),
    path("staff/", StaffListView.as_view(), name="staff-list"),
    path("staff/<uuid:pk>/", StaffDetailView.as_view(), name="staff-detail"),
    path("branches/<uuid:pk>/tables/", TableListCreateView.as_view(), name="table-list"),
    path("branches/<uuid:pk>/tables/<uuid:table_pk>/", TableDetailView.as_view(), name="table-detail"),
]
