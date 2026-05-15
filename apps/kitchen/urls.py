from django.urls import path
from .views import KDSBoardView, KDSStatusUpdateView

urlpatterns = [
    path("board/", KDSBoardView.as_view(), name="kds-board"),
    path("orders/<uuid:pk>/status/", KDSStatusUpdateView.as_view(), name="kds-status"),
]