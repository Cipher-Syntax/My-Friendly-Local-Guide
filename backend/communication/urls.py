from django.urls import path
from .views import ConversationListView, MessageThreadView

urlpatterns = [
    # 1. List Conversations: GET /api/conversations/
    path(
        'conversations/', 
        ConversationListView.as_view(), 
        name='conversation-list'
    ),
    
    # 2. Thread Read/Send: GET/POST /api/conversations/<partner_id>/messages/
    path(
        'conversations/<int:partner_id>/messages/',
        MessageThreadView.as_view(),
        name='message-thread'
    ),
]