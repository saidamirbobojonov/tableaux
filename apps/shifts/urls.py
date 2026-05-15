from django.urls import path
from .views import ShiftManageView, ShiftCurrentView

urlpatterns = [
    path("action/", ShiftManageView.as_view(), name="shift-action"),
    path("current/", ShiftCurrentView.as_view(), name="shift-current"),
]