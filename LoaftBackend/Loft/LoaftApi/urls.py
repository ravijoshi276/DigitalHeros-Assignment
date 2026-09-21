"""
URL configuration for LoaftApi project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""


"""

Root URL router. All app routes namespaced under /api/.
The Stripe webhook sits outside DRF's auth because it uses its own
signature-based verification.
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from accounts.forms import StrictAdminAuthenticationForm

admin.site.login_form = StrictAdminAuthenticationForm

urlpatterns = [
  
    path("admin/", admin.site.urls),

    # ── Auth (Djoser + SimpleJWT) ──────────────────────────────────────────
    path("api/auth/", include("djoser.urls")),
    path("api/auth/", include("djoser.urls.jwt")),

    # ── App APIs ───────────────────────────────────────────────────────────
    path("api/subscriptions/", include("Subscription.urls")),
    path("api/scores/", include("scores.urls")),
    path("api/charities/", include("charities.urls")),
    path("api/draws/", include("draws.urls")),
    path("api/winners/", include("winners.urls")),
    path("api/admin-stats/", include("accounts.urls")),
]

