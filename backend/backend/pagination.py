from rest_framework.pagination import PageNumberPagination


class OptionalPageNumberPagination(PageNumberPagination):
    """
    Opt-in page-number pagination.

    If `page_size` is provided in the query string, DRF returns a paginated
    response. If omitted, DRF returns the original non-paginated list.
    """

    page_size = None
    page_query_param = 'page'
    page_size_query_param = 'page_size'
    max_page_size = 100
