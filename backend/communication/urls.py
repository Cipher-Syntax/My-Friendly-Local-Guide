from django.urls import path
from .views import (
    ConversationDeleteView,
    ConversationListView,
    MessageDeleteView,
    MessageThreadView,
    send_support_email,
)

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
        'conversations/<int:partner_id>/delete/',
        ConversationDeleteView.as_view(),
        name='conversation-delete'
    ),

    path(
        'messages/<int:message_id>/delete/',
        MessageDeleteView.as_view(),
        name='message-delete'
    ),
    
    path(
        'support/',
        send_support_email,
        name='send_support_email'
    ),
]