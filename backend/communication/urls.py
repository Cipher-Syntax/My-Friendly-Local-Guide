from django.urls import path
from .views import ConversationListView, MessageThreadView, send_support_email

urlpatterns = [
    path(
        'conversations/', 
        ConversationListView.as_view(), 
        name='conversation-list'
    ),
    
    path(
        'conversations/<int:partner_id>/messages/',
        MessageThreadView.as_view(),
        name='message-thread'
    ),
    
    path(
        'support/',
        send_support_email,
        name='send_support_email'
    ),
]