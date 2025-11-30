from django.urls import path
from .views import ConversationListView, MessageThreadView

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
]