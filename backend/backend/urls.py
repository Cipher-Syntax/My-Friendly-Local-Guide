from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.core.mail import send_mail
from django.http import HttpResponse

# --- TEMPORARY TEST VIEW TO FORCE ERRORS TO SHOW ---
def test_email_view(request):
    try:
        send_mail(
            subject="LocaLynk Diagnostic Test",
            message="If you receive this, your Django Anymail setup is working perfectly!",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[settings.DEFAULT_FROM_EMAIL], # Sending it to yourself
            fail_silently=False, # Setting this to False forces Django to print the exact error!
        )
        return HttpResponse("""
            <h2 style='color: green;'>Success!</h2> 
            <p>The email API was triggered without any code errors. Please check your inbox (and spam folder) for the test email.</p>
        """)
    except Exception as e:
        return HttpResponse(f"""
            <h2 style='color: red;'>EMAIL FAILED!</h2>
            <p>Here is the exact error preventing your emails from sending:</p>
            <div style='background: #eee; padding: 15px; border-radius: 5px; font-family: monospace;'>
                {str(e)}
            </div>
            <p>Look at the error message above to see if it is an API Key issue, an unverified sender issue, or a network issue.</p>
        """)

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # --- YOUR APP URLS ---
    path('api/', include('user_authentication.urls')),
    path('api/', include('destinations_and_attractions.urls')),
    path('api/', include('accommodation_booking.urls')),
    path('api/', include('communication.urls')),
    path('api/payments/', include('payment.urls')),
    path('api/', include('report.urls')),
    path('api/', include('personalization.urls')),
    path('api/', include('reviews_ratings.urls')),
    
    path('api/', include('system_management_module.urls')),
    path('api/', include('agency_management_module.urls')),
    # --- TEMPORARY TEST ROUTE ---
    path('test-email/', test_email_view, name='test_email'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)