from django.urls import path
from .views import ResolveQRCodeView

urlpatterns = [
    path("<str:token>/", ResolveQRCodeView.as_view(), name="resolve-qr"),
]